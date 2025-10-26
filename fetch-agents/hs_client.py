# hs_client.py
from __future__ import annotations
import os
from typing import Optional, List, Tuple
from urllib.parse import quote
from datetime import datetime
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv()

from uagents import Agent, Context, Protocol, Model

# --- Chat protocol types & spec (we'll include spec via Protocol(spec=...)) ---
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    StartSessionContent,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

# --- Tutorial models (must match hs_agent) ---
class GenerateRequest(Model):
    prompt: str
    transcript: Optional[str] = None
    style: Optional[str] = "concise"
    max_steps: Optional[int] = None

class GenerateResponse(Model):
    title: str
    steps: List[str]
    assumptions: Optional[List[str]] = None
    tips: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    products: Optional[List[str]] = None

class ErrorResponse(Model):
    message: str

# --- Tutorial protocol (name/version must match backend agent) ---
tutorial_proto = Protocol(name="house_tutorial_protocol", version="1.0")

# --- Chat protocol included as a Protocol from its spec (matches your sample) ---
chat_proto = Protocol(spec=chat_protocol_spec)

# === Client agent (Agentverse-facing chat entrypoint) ===
agent = Agent(
    name=os.getenv("CLIENT_NAME", "HouseClient"),
    seed=os.getenv("AGENT_SEED_PHRASE", "HouseClient-seed"),
    port=int(os.getenv("PORT_CLIENT", "8020")),
    mailbox=True,  # keep True if you want manifest/Inspector without a public endpoint
)

# ---------- helpers ----------
def _extract_prompt_transcript(msg: ChatMessage) -> Tuple[Optional[str], Optional[str]]:
    """
    If the user sends one text, treat it as 'prompt'.
    If they send two texts in the same ChatMessage, treat the second as 'transcript'.
    """
    texts = [c.text.strip() for c in msg.content if isinstance(c, TextContent) and (c.text or "").strip()]
    prompt = texts[0] if texts else None
    transcript = texts[1] if len(texts) > 1 else None
    return prompt, transcript

def _format_tutorial(resp: GenerateResponse) -> str:
    lines: List[str] = [f"# {resp.title}", ""]
    if resp.tools or resp.products:
        lines.append("## Tools & Products")
        for x in resp.tools or []:
            lines.append(f"- {x}")
        for x in resp.products or []:
            lines.append(f"- {x}")
        lines.append("")
    lines.append("## Steps")
    for i, step in enumerate(resp.steps, 1):
        lines.append(f"{i}. {step}")
    if resp.assumptions:
        lines.append("\n## Assumptions")
        for a in resp.assumptions:
            lines.append(f"- {a}")
    if resp.tips:
        lines.append("\n## Tips")
        for t in resp.tips:
            lines.append(f"- {t}")
    return "\n".join(lines)

def _chunk_text(s: str, limit: int = 1800) -> List[str]:
    parts: List[str] = []
    buf = ""
    for para in s.split("\n\n"):
        candidate = (f"{buf}\n\n{para}".strip()) if buf else para
        if len(candidate) <= limit:
            buf = candidate
        else:
            if buf:
                parts.append(buf)
            if len(para) <= limit:
                buf = para
            else:
                p = para
                while len(p) > limit:
                    parts.append(p[:limit])
                    p = p[limit:]
                buf = p
    if buf:
        parts.append(buf)
    return parts

# ---------- Chat handlers (incorporate your snippet's behavior) ----------

@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    # ACK only (so Agentverse shows delivered)
    await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=getattr(msg, "msg_id", None)))

    # Extract prompt/transcript (1st text = prompt, 2nd = transcript)
    texts = [c.text.strip() for c in (msg.content or [])
             if isinstance(c, TextContent) and (c.text or "").strip()]
    if not texts:
        return
    prompt = texts[0]
    transcript = texts[1] if len(texts) > 1 else None

    # Forward to your backend agent
    to_addr = os.getenv("HOUSE_GUIDE_ADDRESS")
    if not to_addr:
        await ctx.send(sender, ChatMessage(
            content=[TextContent(type="text", text="HOUSE_GUIDE_ADDRESS is not set on this client.")]
        ))
        return

    ctx.storage.set("reply_peer", sender)
    await ctx.send(to_addr, GenerateRequest(prompt=prompt, transcript=transcript, style="concise"))

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    # No-op, but present to mirror your example
    pass

# ---------- Tutorial responses from backend agent ----------

@tutorial_proto.on_message(model=GenerateResponse)
async def handle_tutorial_ok(ctx: Context, sender: str, msg: GenerateResponse):
    peer = ctx.storage.get("reply_peer") or sender
    lines = [f"**{msg.title}**", ""]
    if msg.tools or msg.products:
        lines.append("**Tools & Products**")
        n = 1
        for x in msg.tools or []: lines.append(f"{n}. {x}"); n += 1
        for x in msg.products or []: lines.append(f"{n}. {x}"); n += 1
        lines.append("")
    lines.append("**Steps**")
    for i, step in enumerate(msg.steps, 1): lines.append(f"{i}. {step}")
    if msg.assumptions:
        lines.append(""); lines.append("**Assumptions**")
        for i, a in enumerate(msg.assumptions, 1): lines.append(f"{i}. {a}")
    if msg.tips:
        lines.append(""); lines.append("**Tips**")
        for i, t in enumerate(msg.tips, 1): lines.append(f"{i}. {t}")
    await ctx.send(peer, ChatMessage(content=[TextContent(type="text", text="\n".join(lines))]))

@tutorial_proto.on_message(model=ErrorResponse)
async def handle_tutorial_err(ctx: Context, sender: str, msg: ErrorResponse):
    peer = ctx.storage.get("reply_peer") or sender
    await ctx.send(peer, ChatMessage(timestamp=datetime.now(), msg_id=uuid4(),
                                     content=[TextContent(type="text", text=f"Error: {msg.message}")]))

# ---------- Include protocols & run ----------
agent.include(chat_proto, publish_manifest=True)
agent.include(tutorial_proto, publish_manifest=True)

if __name__ == "__main__":
    # Print a local Inspector-style link (works if you later expose the port publicly or use mailbox)
    base = f"http://127.0.0.1:8020"
    try:
        encoded = quote(base, safe="")
        print("HouseClient address:", agent.address)
        print("Agent inspector (local base):", f"https://agentverse.ai/inspect/?uri={encoded}&address={agent.address}")
    except Exception:
        pass

    # Start the agent (built-in server; no external Bureau object)
    agent.run()

