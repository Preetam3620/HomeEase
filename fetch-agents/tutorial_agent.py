from __future__ import annotations
from typing import List, Optional, Dict, Any
import os
import json

from pydantic import BaseModel
from uagents import Agent, Context, Protocol, Model, Bureau
from dotenv import load_dotenv
load_dotenv()


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

class StoreSearchRequest(BaseModel):
    location: str
    requirements: Optional[List[str]] = None
    radius: Optional[int] = 10000
    limit: Optional[int] = 20

class APIRequest(Model):
    prompt: str
    address: str
    transcript: Optional[str] = None
    style: Optional[str] = "concise"
    max_steps: Optional[int] = None

class TutorialResponse(BaseModel):
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
agent = Agent(
    name="HouseGuide", 
    seed="HouseGuide-seed", 
    port=8000,
    mailbox=True
)

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
    print(" Could not convert chat_protocol_spec to Protocol. Chat manifest not published.")

# ----- Minimal Chat Handlers -----
@agent.on_message(model=ChatMessage, replies={ChatAcknowledgement, ChatMessage})
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=getattr(msg, "msg_id", None)))

    texts = []
    for part in msg.content:
        if isinstance(part, TextContent) and (part.text or "").strip():
            texts.append(part.text.strip())

    if texts:
        reply = ("Hi! I'm your House-Services guide. Tell me what you're fixing and I'll "
                 "generate a step-by-step plan plus a tools/products list.")
    else:
        reply = "Session noted. What home repair or task would you like help with?"

    await ctx.send(sender, ChatMessage(content=[TextContent(type="text", text=reply)]))

# -------- Model Import -------

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

def _fallback(prompt: str, transcript: Optional[str], max_steps: int) -> Dict[str, Any]:
    base_steps = [
        "Shut off relevant utilities (water/power/gas). Wear basic PPE.",
        "Gather simple tools and materials you likely have at home.",
        "Prepare the area and protect nearby surfaces.",
        "Perform the core fix in small, verifiable steps.",
        "Test the result and check for leaks/noise/looseness.",
        "Clean up; restore utilities; note when to call a pro.",
    ]
    tools = [
        "Adjustable wrench", "Pliers", "Screwdrivers", "Bucket/towels",
        "Plumber's tape (PTFE)", "Utility knife"
    ]
    products = [
        "Replacement part (washer/gasket/cartridge as applicable)",
        "Mild cleaner or vinegar", "Rags or paper towels"
    ]
    return {
        "title": f"How to: {prompt[:60] if prompt else 'Home Task'}",
        "steps": base_steps[: (max_steps or 8)],
        "assumptions": ["Beginner user; renter-friendly approach; typical household fixtures."],
        "tips": [
            "Work slowly; stop if unsure; take photos before disassembly.",
            "Escalate to a professional for damaged valves, gas odors, or wiring faults."
        ],
        "tools": tools,
        "products": products,
    }

def _anthropic_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    if not ANTHROPIC_API_KEY:
        return {}
    try:
        from anthropic import Anthropic  # pip install anthropic
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1100,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = "".join(getattr(p, "text", "") for p in msg.content)
        i, j = text.find("{"), text.rfind("}")
        if i == -1 or j == -1 or j < i:
            return {}
        return json.loads(text[i:j+1])
    except Exception:
        return {}

def llm_generate_steps(
    prompt: str,
    transcript: Optional[str] = None,
    style: str = "concise",
    max_steps: Optional[int] = None,
) -> Dict[str, Any]:
    # House-Services Guide — safety-forward, renter-friendly, with tools/products
    system_prompt = (
        "You are a House-Services Guide for home maintenance and repair. "
        "Goals: (1) safety first, (2) household best practices, (3) renter-friendly options, "
        "(4) clear, testable steps.\n\n"
        "INPUTS:\n"
        "- User goal.\n"
        "- Optional transcript with extra context.\n\n"
        "OUTPUT (JSON only): {title, steps[], assumptions[], tips[], tools[], products[]}\n"
        "STYLE & PRIORITIES:\n"
        "• Safety first (PPE, shutoffs, hazards). Include a verification step.\n"
        "• Renter-friendly, non-destructive where possible.\n"
        "• Steps: short, imperative, verifiable. Keep at most 'max_steps'.\n"
        "• Tools/products: the minimal realistic list for a beginner.\n"
        "• Tips: common pitfalls; 1-3 escalation cases when to call a professional.\n\n"
        "CONTEXT (use verbatim when helpful):\n"
        f"{(transcript or '').strip()}\n\n"
        "Return valid JSON only, with no extra commentary."
    )

    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "steps": {"type": "array", "items": {"type": "string"}},
            "assumptions": {"type": "array", "items": {"type": "string"}},
            "tips": {"type": "array", "items": {"type": "string"}},
            "tools": {"type": "array", "items": {"type": "string"}},
            "products": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "steps"],
    }
    payload = {"goal": prompt, "style": style, "max_steps": max_steps}
    user_prompt = (
        "Schema:\n" + json.dumps(schema) + "\n\n"
        "Payload:\n" + json.dumps(payload) + "\n\n"
        "Write JSON matching the schema. Keep steps <= max_steps."
    )

    data = _anthropic_json(system_prompt, user_prompt)
    if not data or not isinstance(data, dict) or not data.get("steps"):
        return _fallback(prompt, transcript, max_steps)

    # Coerce & cap
    data["title"] = str(data.get("title", f"How to: {prompt[:60]}"))
    if max_steps:
        data["steps"] = [str(s).strip() for s in data.get("steps", [])][:max_steps]
    else:
        data["steps"] = [str(s).strip() for s in data.get("steps", [])]
    for k in ("assumptions", "tips", "tools", "products"): 
        if data.get(k):
            data[k] = [str(x).strip() for x in data[k]]
    return data

@agent.on_rest_post(endpoint="/tutorial-agent", request=APIRequest, response=TutorialResponse)
async def handle_tutorial_api(ctx: Context, req: APIRequest):
    ctx.logger.info(f"📥 RECEIVED from {req} | prompt='{(req.prompt or '')[:80]}'")
    try:
        data = llm_generate_steps(
            req.prompt, req.transcript, req.style or "concise", req.max_steps
        )

        ctx.logger.info(f"Steps: {data.get('steps', [])} | Tools: {data.get('tools', [])}")

        # Send store search request to Store Finder Agent
        await ctx.send("agent1qfqtn4lhf55jd06jtfa4sxld36as6kjrzpxpc2ejp2e8f7ptek2cvaghpyx", StoreSearchRequest(
            location=req.address,
            requirements=data.get("tools", []),
            radius=10000,
            limit=20
        ))
        ctx.logger.info(f"Sent StoreSearchRequest to STORE_FINDER_AGENT | location: {req.address} | tools: {data.get('tools', [])}")

        # return API response
        return TutorialResponse(
            title=data.get("title", "Home Tutorial"),
            steps=list(data.get("steps", [])),
            assumptions=data.get("assumptions"),
            tips=data.get("tips"),
            tools=data.get("tools"),
            products=data.get("products"),
        )
    except Exception as e:
        await ctx.send("", ErrorResponse(message=f"Failed: {e}"))


# ----- Public runner (Agentverse / Inspector) -----
if __name__ == "__main__":
    agent.run()