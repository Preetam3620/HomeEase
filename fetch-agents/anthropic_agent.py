from __future__ import annotations
from typing import List, Optional, Any

# Optional: Anthropic SDK
try:
    from anthropic import Anthropic
except Exception:  # pragma: no cover
    Anthropic = None  # type: ignore


class AnthropicAgent:
    """Anthropic LLM agent for processing user queries and generating responses."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
        if Anthropic is not None and api_key:
            self.client = Anthropic(api_key=api_key)
        self.conversation_history: List[dict] = []

    def process_hardware_store_query(
        self,
        location: str,
        requirements: List[str],
        hardware_stores: List[Any],
    ) -> str:
        system_prompt = _create_system_prompt()
        user_prompt = _create_user_prompt(location, requirements, hardware_stores)

        if self.client is None:
            return _fallback_format(hardware_stores)

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            content = getattr(response, "content", None) or []
            first = content[0] if content else None
            text = getattr(first, "text", None)
            return text or _fallback_format(hardware_stores)
        except Exception as e:
            return f"Error processing query with Anthropic: {e}"

    def chat_with_user(self, message: str) -> str:
        if self.client is None:
            return "Tell me your city/address and what you need, and I’ll list nearby hardware stores."

        try:
            self.conversation_history.append({"role": "user", "content": message})
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=self.conversation_history,
            )
            assistant_response = response.content[0].text
            self.conversation_history.append({"role": "assistant", "content": assistant_response})
            return assistant_response
        except Exception as e:
            return f"Error in chat: {e}"

    def clear_conversation(self):
        self.conversation_history = []


# ---------- Prompt helpers ----------
def _create_system_prompt() -> str:
    return (
        "You are a simple data formatter for hardware stores.\n"
        "Your role is to format hardware store data in a clean, simple list format.\n\n"
        "Format requirements:\n"
        "1. List only the top 5 stores\n"
        "2. Include: Name, Address, Distance, Rating, Phone, Google Maps link\n"
        "3. No recommendations or analysis\n"
        "4. No additional commentary\n"
        "5. Use simple, clean formatting\n\n"
        "Format each store as:\n"
        "[Number]. [Store Name]\n"
        "Address: [Full Address]\n"
        "Distance: [X.X] miles\n"
        "Rating: [X.X]/5 ([X] reviews)\n"
        "Phone: [Phone Number]\n"
        "Google Maps: [Google Maps URL]"
    )


def _create_user_prompt(location: str, requirements: List[str], hardware_stores: List[Any]) -> str:
    stores_info = _format_stores_for_prompt(hardware_stores)
    reqs = ", ".join(requirements) if requirements else "General hardware store visit"

    return (
        f"Location: {location}\n"
        f"Requirements: {reqs}\n\n"
        "Hardware stores found:\n\n"
        f"{stores_info}\n\n"
        "Format the top 5 stores in the requested format with Google Maps links."
    )


def _format_stores_for_prompt(hardware_stores: List[Any]) -> str:
    if not hardware_stores:
        return "No hardware stores found in the area."

    formatted: List[str] = []
    for i, store in enumerate(hardware_stores[:5], 1):
        name = _get(store, "name")
        address = _get(store, "address")
        distance = _get(store, "distance")
        rating = _get(store, "rating")
        review_count = _get(store, "review_count")
        phone = _get(store, "phone")

        maps_url = f"https://www.google.com/maps/search/?api=1&query={str(name).replace(' ', '+')}+{str(address).replace(' ', '+')}"
        parts = [
            f"{i}. {name}",
            f"   Address: {address}",
            f"   Distance: {float(distance):.2f} miles" if distance not in (None, "") else None,
            (f"   Rating: {float(rating):.1f}/5 ({int(review_count)} reviews)"
             if (rating not in (None, "") and review_count not in (None, "")) else None),
            f"   Phone: {phone}" if phone else None,
            f"   Google Maps: {maps_url}",
        ]
        formatted.append("\n".join(p for p in parts if p))

    return "\n\n".join(formatted)


def _fallback_format(hardware_stores: List[Any]) -> str:
    if not hardware_stores:
        return "No hardware stores found in the specified area."

    out: List[str] = []
    for i, store in enumerate(hardware_stores[:5], 1):
        name = _get(store, "name")
        address = _get(store, "address")
        distance = _get(store, "distance")
        rating = _get(store, "rating")
        review_count = _get(store, "review_count")
        phone = _get(store, "phone")

        maps_url = f"https://www.google.com/maps/search/?api=1&query={str(name).replace(' ', '+')}+{str(address).replace(' ', '+')}"
        block = "\n".join(
            [
                f"{i}. {name}",
                f"Address: {address}",
                f"Distance: {float(distance):.2f} miles" if distance not in (None, "") else "Distance: N/A",
                (f"Rating: {float(rating):1.1f}/5 ({int(review_count)} reviews)"
                 if (rating not in (None, "") and review_count not in (None, "")) else "Rating: N/A"),
                f"Phone: {phone or 'N/A'}",
                f"Google Maps: {maps_url}",
            ]
        )
        out.append(block)

    return "\n\n".join(out)


def _get(obj: Any, key: str) -> Any:
    if hasattr(obj, key):
        return getattr(obj, key)
    if isinstance(obj, dict):
        return obj.get(key)
    return None
