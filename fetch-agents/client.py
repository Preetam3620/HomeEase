# client.py — Chat-only Agent that imports and calls main.StoreFinderCore directly

from __future__ import annotations
import os
from typing import List
from datetime import datetime
from uuid import uuid4
from urllib.parse import quote

# --- env & SSL niceties ---
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except Exception:
    pass

from uagents import Agent, Context, Protocol
from uagents.setup import fund_agent_if_low
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)

# ---- import primitives from your backend file (main.py) ----
# (main.py must not auto-run the agent when imported; it should have `if __name__ == "__main__": agent.run()`)
from main import (
    StoreFinderCore,
    StoreSearchRequest,
    StoreSearchResponse,
    parse_query,    # your robust parser
)

# ---- helper to build the chat protocol from spec (handles version diffs) ----
def _chat_to_protocol(spec) -> Protocol:
    for attr in ("to_protocol", "as_protocol", "build", "create_protocol"):
        fn = getattr(spec, attr, None)
        if callable(fn):
            try:
                return fn()
            except Exception:
                pass
    return Protocol(spec=spec)  # final fallback

chat_proto = _chat_to_protocol(chat_protocol_spec)

store_proto = Protocol(name="store_finder_protocol", version="1.0")

# ---- tiny formatter for chat output ----
def _format_stores_for_chat(location: str, resp: StoreSearchResponse) -> str:
    if not resp.success:
        return f"❌ {resp.error_message or 'No stores found'}"

    lines: List[str] = [f"🔍 Found {resp.stores_found} but showing you top 5 stores near {location}:\n"]
    for i, s in enumerate(resp.stores[:5], 1):
        lines.append(
            f"{i}. **{s['name']}**\n"
            f"   📍 {s['address']}\n"
            f"   📏 {s['distance']:.2f} miles\n"
            f"   ⭐ {s['rating']}/5\n"
            f"   🗺️ {s['google_maps']}\n"
        )
    return "\n".join(lines)

# ---- agent config ----
PORT_CLIENT = int(os.getenv("PORT_CLIENT", "8001"))
LOCAL_BASE = os.getenv("LOCAL_BASE_CLIENT", f"http://localhost:{PORT_CLIENT}")

agent = Agent(
    name=os.getenv("CLIENT_NAME", "store_finder_client"),
    seed=os.getenv("CLIENT_SEED", "store-finder-client-seed"),
    port=PORT_CLIENT,
    mailbox=True,   # required so AgentVerse can reach your local agent
)
fund_agent_if_low(agent.wallet.address())

# single in-process core instance
print("[INIT] Attempting to initialize StoreFinderCore...")
print(f"[INIT] YELP_API_KEY present: {bool(os.getenv('YELP_API_KEY'))}")
print(f"[INIT] ANTHROPIC_API_KEY present: {bool(os.getenv('ANTHROPIC_API_KEY'))}")

try:
    _core = StoreFinderCore()
    print("[INIT] ✅ StoreFinderCore initialized successfully")
except Exception as e:
    print(f"[INIT] ❌ StoreFinderCore initialization failed: {e}")
    import traceback
    traceback.print_exc()
    _core = None

# ---------------- Chat Handlers ----------------
@chat_proto.on_message(ChatMessage)
async def on_chat(ctx: Context, sender: str, msg: ChatMessage):
    # CRITICAL: This handler IS BEING CALLED
    print(f"\n{'='*80}")
    print(f"[CHAT] 🎯 HANDLER CALLED! From: {sender}")
    print(f"[CHAT] Msg type: {type(msg)}")
    print(f"{'='*80}\n")
    
    # Ignore self-echoes
    if sender == agent.address:
        print("[CHAT] ⚠️ Ignoring self-echo")
        ctx.logger.debug("[CHAT] ignoring self-echo")
        return

    # Extract and log the actual message content
    texts: List[str] = [
        c.text.strip()
        for c in (msg.content or [])
        if isinstance(c, TextContent) and (c.text or "").strip()
    ]
    
    user_msg = " ".join(texts) if texts else ""
    
    # Log to both logger and print for terminal visibility
    ctx.logger.info(f"[CHAT] incoming from {sender}: ChatMessage(...)")
    ctx.logger.info(f"[CHAT] message content: {user_msg if user_msg else '(empty or non-text)'}")
    
    # Also print to terminal for visibility
    print(f"\n[CHAT] ⬇️ Incoming message from {sender}")
    print(f"[CHAT] 📝 Content: {user_msg if user_msg else '(empty or non-text)'}")

    # ACK quickly (spec expects this)
    try:
        await ctx.send(
            sender,
            ChatAcknowledgement(
                timestamp=datetime.now(),
                acknowledged_msg_id=getattr(msg, "msg_id", None),
            ),
        )
        ctx.logger.info(f"[CHAT] sent acknowledgment to {sender}")
        print(f"[CHAT] ✅ Sent acknowledgment to {sender}")
    except Exception as e:
        ctx.logger.warning(f"[CHAT] ACK failed: {e}")
        print(f"[CHAT] ❌ ACK failed: {e}")

    # Greeting if session starts
    if any(isinstance(c, StartSessionContent) for c in (msg.content or [])):
        greet = "Find hardware stores near Austin, TX for drill bits and paint."
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.now(),
                msg_id=uuid4(),
                content=[TextContent(type="text", text=greet)],
            ),
        )
        ctx.logger.info(f"[CHAT] sent greeting to {sender}")

    # Extract user text(s) - already done above
    if not texts:
        hint = "Find hardware stores near <city, state> for <items>"
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.now(),
                msg_id=uuid4(),
                content=[TextContent(type="text", text=hint)],
            ),
        )
        ctx.logger.info("[CHAT] no text found, sent hint")
        return

    ctx.logger.info(f"[CHAT] processing query: {user_msg}")
    print(f"[CHAT] 🔍 Processing query: {user_msg}")

    # Use your backend core directly
    try:
        if _core is None:
            raise Exception("StoreFinderCore is not initialized. Check API keys in .env file.")
        
        location, requirements = parse_query(user_msg)
        if not location:
            reply = "Add a location, e.g., 'near Austin, TX'."
            ctx.logger.warning("[CHAT] no location found in query")
            print("[CHAT] ⚠️ No location found in query")
        else:
            ctx.logger.info(f"[CHAT] searching for stores near {location}")
            print(f"[CHAT] 🔎 Searching for stores near {location}")
            req = StoreSearchRequest(location=location, requirements=requirements or None)
            resp: StoreSearchResponse = _core.search(req)
            reply = _format_stores_for_chat(location, resp)
            ctx.logger.info(f"[CHAT] found {resp.stores_found} stores")
            print(f"[CHAT] ✅ Found {resp.stores_found} stores")
    except Exception as e:
        ctx.logger.exception("[CHAT] processing error")
        print(f"[CHAT] ❌ Error: {e}")
        reply = f"❌ Error processing your request: {e}"

    # Send the reply
    await ctx.send(
        sender,
        ChatMessage(
            timestamp=datetime.now(),
            msg_id=uuid4(),
            content=[TextContent(type="text", text=reply)],
        ),
    )
    ctx.logger.info(f"[CHAT] reply sent to {sender}")
    print(f"[CHAT] ⬆️ Reply sent to {sender}")
    print("=" * 80)

@chat_proto.on_message(ChatAcknowledgement)
async def on_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.debug(f"[CHAT] ack from {sender}: {msg}")

# ---- include & run ----
print("[INIT] Registering chat_proto...")
agent.include(chat_proto, publish_manifest=True)
print("[INIT] Registering store_proto...")
agent.include(store_proto, publish_manifest=True)
print("[INIT] Protocols registered")

@agent.on_event("startup")
async def _startup(ctx: Context):
    print("=" * 80)
    print("🚀 Store Finder Client Starting...")
    print("=" * 80)
    
    if os.getenv("AGENTVERSE_API_KEY"):
        os.environ["AGENTVERSE_API_KEY"] = os.getenv("AGENTVERSE_API_KEY")
        ctx.logger.info("🔑 AgentVerse API key loaded")
        print("✅ AgentVerse API key configured")
    else:
        print("⚠️ AGENTVERSE_API_KEY not set - agent may not be reachable from agentverse")
    
    ctx.logger.info("💬 Store Finder Client started")
    ctx.logger.info(f"Address: {agent.address}")
    
    print(f"📝 Agent Address: {agent.address}")
    print(f"🌐 Mailbox enabled for agentverse")
    
    # Check if core is initialized
    if _core is None:
        print("❌ StoreFinderCore NOT initialized - check logs above for errors")
        print("❌ The agent will respond but cannot process queries")
    else:
        print("✅ StoreFinderCore is ready")
    
    inspector_url = f"https://agentverse.ai/inspect/?uri={quote(LOCAL_BASE, safe='')}&address={agent.address}"
    ctx.logger.info(f"Inspector: {inspector_url}")
    print(f"🔗 Inspector: {inspector_url}")
    print("=" * 80)
    print("👂 Listening for chat messages from agentverse...")
    print("=" * 80)

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🏪 Store Finder Client")
    print("=" * 80)
    print(f"📝 Address: {agent.address}")
    print(f"🌐 Mailbox: Enabled")
    inspector_url = f"https://agentverse.ai/inspect/?uri={quote(LOCAL_BASE, safe='')}&address={agent.address}"
    print(f"🔗 Inspector URL:")
    print(f"   {inspector_url}")
    print("=" * 80 + "\n")
    agent.run()
