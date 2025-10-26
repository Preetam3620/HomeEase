# hs_model.py
from __future__ import annotations
import os, json
from typing import Dict, Any, List, Optional

# Load .env if present
try:
    from dotenv import load_dotenv  # pip install python-dotenv
    load_dotenv()
except Exception:
    pass

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
        "Plumber’s tape (PTFE)", "Utility knife"
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
        "• Tips: common pitfalls; 1–3 escalation cases when to call a professional.\n\n"
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

if __name__ == "__main__":
    # quick manual test
    p = os.getenv("HS_TEST_PROMPT", "Fix a leaking kitchen faucet.")
    t = os.getenv("HS_TEST_TRANSCRIPT", "Single-handle faucet drips from spout; shutoff valves present.")
    out = llm_generate_steps(p, t, "concise", 6)
    print(json.dumps(out, indent=2))

