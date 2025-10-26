from __future__ import annotations
from typing import List, Optional
import os

from uagents import Agent, Context, Protocol, Model, Bureau
from hs_model import llm_generate_steps

# Chat protocol components (spec + types)
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec,
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    EndSessionContent,
    StartSessionContent,
)

# ----- Models -----
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

# ----- Tutorial Protocol -----
tutorial_proto = Protocol(name="house_tutorial_protocol", version="1.0")

@tutorial_proto.on_message(model=GenerateRequest, replies={GenerateResponse, ErrorResponse})
async def handle_tutorial(ctx: Context, sender: str, msg: GenerateRequest):
    ctx.logger.info(f"📥 RECEIVED from {sender} | prompt='{(msg.prompt or '')[:80]}'")
    try:
        data = llm_generate_steps(
            msg.prompt, msg.transcript, msg.style or "concise", msg.max_steps
        )
        await ctx.send(sender, GenerateResponse(
            title=data.get("title", "Home Tutorial"),
            steps=list(data.get("steps", [])),
            assumptions=data.get("assumptions"),
            tips=data.get("tips"),
            tools=data.get("tools"),
            products=data.get("products"),
        ))
        ctx.logger.info(f"📤 REPLIED to {sender} with {len(data.get('steps', []))} steps")
    except Exception as e:
        await ctx.send(sender, ErrorResponse(message=f"Failed: {e}"))

# ----- Agent -----
# If your uagents build doesn't support mailbox=..., remove it.
agent = Agent(name="HouseGuide", seed="HouseGuide-seed", mailbox=True)

# Include our tutorial protocol (publish so others can discover it)
agent.include(tutorial_proto, publish_manifest=True)

# === 🔧 Convert chat_protocol_spec → Protocol for older/newer versions ===
def _chat_as_protocol(spec):
    # Try common constructors across uagents/uagents_core versions
    for attr in ("to_protocol", "as_protocol", "build", "create_protocol"):
        fn = getattr(spec, attr, None)
        if callable(fn):
            try:
                return fn()
            except Exception:
                pass
    # Try the uAgents helper if available
    try:
        return Protocol.from_spec(spec)  # some versions provide this
    except Exception:
        return None

_chat_proto = _chat_as_protocol(chat_protocol_spec)
if _chat_proto is not None:
    agent.include(_chat_proto, publish_manifest=True)
else:
    # Fallback: don't publish the chat spec (handlers still work, but Inspector chat may be disabled)
    print("⚠️ Could not convert chat_protocol_spec to Protocol. Chat manifest not published.")

# ----- Minimal Chat Handlers -----
@agent.on_message(model=ChatMessage, replies={ChatAcknowledgement, ChatMessage})
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=getattr(msg, "msg_id", None)))

    texts = []
    for part in msg.content:
        if isinstance(part, TextContent) and (part.text or "").strip():
            texts.append(part.text.strip())

    if texts:
        reply = ("Hi! I’m your House-Services guide. Tell me what you’re fixing and I’ll "
                 "generate a step-by-step plan plus a tools/products list.")
    else:
        reply = "Session noted. What home repair or task would you like help with?"

    await ctx.send(sender, ChatMessage(content=[TextContent(type="text", text=reply)]))

# ----- Public runner (Agentverse / Inspector) -----
if __name__ == "__main__":
    agent.run()
