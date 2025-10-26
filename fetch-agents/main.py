# main.py
"""
Store Finder uAgent - Backend Worker (no chat)
"""

from __future__ import annotations
import os, re
from typing import Optional, List, Tuple
from datetime import datetime
from urllib.parse import quote

# env + macOS SSL
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

from uagents import Agent, Context, Protocol, Model
from uagents.setup import fund_agent_if_low

from yelp_client import YelpAPI, HardwareStore
from anthropic_agent import AnthropicAgent
from config import Config

# ---------------- Models ----------------
class StoreSearchRequest(Model):
    location: str
    requirements: Optional[List[str]] = None
    radius: Optional[int] = 10000
    limit: Optional[int] = 20

class StoreSearchResponse(Model):
    success: bool
    stores_found: int
    stores: List[dict]
    ai_analysis: str
    error_message: Optional[str] = None
    timestamp: str

# (requested) robust parser — import/use from client if needed
def parse_query(user_input: str) -> Tuple[str, List[str]]:
    """
    Extract 'near/in/at/around <location>' safely. Stops at newline / ' for ' / ':'.
    Returns (location, requirement_keywords_found).
    """
    m = re.search(r"(?:near|in|around|at)\s+(.+?)\s*(?:\n| for |:|$)", user_input, re.IGNORECASE)
    location = (m.group(1).strip() if m else "")
    if len(location) > 80:
        location = location[:80].rsplit(" ", 1)[0]

    reqs: List[str] = []
    low = user_input.lower()
    for k in ["tools","screws","nails","paint","lumber","electrical","plumbing","hardware",
              "supplies","equipment","drill","drill bits"]:
        if k in low and k not in reqs:
            reqs.append(k)
    return location, reqs

# ---------------- Protocol ----------------
store_proto = Protocol(name="store_finder_protocol", version="1.0")

# ---------------- Core ----------------
class StoreFinderCore:
    def __init__(self):
        self.config = Config()
        if not self.config.validate():
            raise ValueError("Invalid configuration. Check your API keys.")
        self.yelp = YelpAPI(self.config.get_yelp_api_key())
        self.claude = AnthropicAgent(self.config.get_anthropic_api_key())

    def search(self, req: StoreSearchRequest) -> StoreSearchResponse:
        now = datetime.now().isoformat()
        try:
            results: List[HardwareStore] = self.yelp.search_hardware_stores(
                location=req.location, radius=req.radius, limit=req.limit
            )
            if not results:
                return StoreSearchResponse(
                    success=False, stores_found=0, stores=[],
                    ai_analysis="No hardware stores found in the specified area.",
                    error_message="No results found", timestamp=now,
                )

            ai = self.claude.process_hardware_store_query(
                location=req.location,
                requirements=req.requirements or [],
                hardware_stores=results,
            )

            top: List[dict] = []
            for s in results[:5]:
                top.append({
                    "name": s.name, "address": s.address, "city": s.city, "state": s.state,
                    "zip_code": s.zip_code, "phone": s.phone, "rating": s.rating,
                    "review_count": s.review_count, "distance": s.distance, "url": s.url,
                    "categories": s.categories,
                    "google_maps": f"https://www.google.com/maps/search/?api=1&query={s.name.replace(' ','+')}+{s.address.replace(' ','+')}",
                })

            return StoreSearchResponse(
                success=True, stores_found=len(results), stores=top,
                ai_analysis=ai, timestamp=now,
            )

        except Exception as e:
            msg = str(e)
            if "400" in msg:
                msg = "The location wasn’t valid for Yelp. Try a city/state or full address."
            return StoreSearchResponse(
                success=False, stores_found=0, stores=[], ai_analysis="",
                error_message=msg, timestamp=now,
            )

core = StoreFinderCore()

# ---------------- Handlers ----------------
@store_proto.on_message(model=StoreSearchRequest, replies=StoreSearchResponse)
async def handle_store_search(ctx: Context, sender: str, msg: StoreSearchRequest):
    ctx.logger.info(f"[STORE] request from {sender} | location='{msg.location}' | reqs={msg.requirements}")
    resp = core.search(msg)
    await ctx.send(sender, resp)
    ctx.logger.info("[STORE] response sent")

# ---------------- Agent ----------------
PORT_BACKEND = int(os.getenv("PORT_BACKEND", "8010"))
LOCAL_BASE = os.getenv("LOCAL_BASE_BACKEND", f"http://127.0.0.1:{PORT_BACKEND}")

agent = Agent(
    name=os.getenv("BACKEND_NAME", "store_finder_backend"),
    seed=os.getenv("BACKEND_SEED", "store-finder-backend-seed"),
    port=PORT_BACKEND,
    endpoint=[f"{LOCAL_BASE}/submit"],
    mailbox=True,
)

fund_agent_if_low(agent.wallet.address())
agent.include(store_proto, publish_manifest=True)

@agent.on_event("startup")
async def _startup(ctx: Context):
    ctx.logger.info("🏪 Store Finder Backend started")
    ctx.logger.info(f"Backend address: {agent.address}")
    ctx.logger.info(f"Local endpoint: {LOCAL_BASE}/submit")
    ctx.logger.info(
        "Inspector: https://agentverse.ai/inspect/?uri=%s&address=%s",
        quote(LOCAL_BASE, safe=""),
        agent.address,
    )

if __name__ == "__main__":
    print("Backend address:", agent.address)
    enc = quote(LOCAL_BASE, safe="")
    print("Inspector:", f"https://agentverse.ai/inspect/?uri={enc}&address={agent.address}")
    agent.run()
