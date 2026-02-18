"""FastAPI application with all routes, SSE streaming, and WebSocket.

Ported from legacy/app.py L393-491 (Handler class + server setup).
"""

import asyncio
import queue as qmod
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse

from .api_service import ApiService
from .event_bus import events
from .models import (
    ActivateRequest,
    AddCategoryRequest,
    AddFavoriteRequest,
    AiGenerateRequest,
    BulkRunRequest,
    DeleteCategoryRequest,
    DeleteProfileRequest,
    DiscoverServicesRequest,
    DiscoverSsoRequest,
    EditCategoryRequest,
    InfraDiagramRequest,
    InfraLlmLayoutRequest,
    InfraScanRequest,
    SetEncodingRequest,
    GetCostRequest,
    ImportSsoAccountsRequest,
    RemoveFavoriteRequest,
    RunCommandRequest,
    SaveLlmConfigRequest,
    SetProfileCategoryRequest,
    SetThemeRequest,
    TestLlmProviderRequest,
    ToggleCollapsedRequest,
    ValidateNameRequest,
)

api = ApiService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: mirror legacy behavior
    def startup():
        import time
        time.sleep(1)
        api._bg_identity(api._active)
        api.discover_services()
        api.fetch_cost_badges()
        sso = api.check_sso_status()
        if sso:
            events.send("sso_status", sso)

    threading.Thread(target=startup, daemon=True).start()
    yield


app = FastAPI(title="AWS Profile Manager", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# --- Static / Legacy UI ---

LEGACY_DIR = Path(__file__).parent.parent / "legacy"
STATIC_DIR = Path(__file__).parent / "static"


@app.get("/", response_class=HTMLResponse)
async def serve_root():
    # Serve built React SPA if available, else legacy UI
    spa_path = STATIC_DIR / "index.html"
    if spa_path.exists():
        return HTMLResponse(spa_path.read_text(encoding="utf-8"))
    ui_path = LEGACY_DIR / "ui.html"
    if ui_path.exists():
        return HTMLResponse(ui_path.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>AWS Profile Manager</h1><p>Frontend not found.</p>")


# --- GET endpoints ---

@app.get("/api/state")
async def get_state():
    return api.get_state()


@app.get("/api/logo")
async def get_logo():
    return {"data": api.get_logo()}


@app.get("/api/sso_status")
async def sso_status():
    return api.check_sso_status()


@app.get("/api/export")
async def export_json():
    return api.export_json()


# --- SSE endpoint ---

@app.get("/api/events")
async def sse_events():
    q = events.add_sse_client()

    async def event_generator():
        loop = asyncio.get_event_loop()
        try:
            while True:
                try:
                    msg = await loop.run_in_executor(None, lambda: q.get(timeout=15))
                    yield msg
                except qmod.Empty:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            events.remove_sse_client(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# --- WebSocket endpoint for terminal ---

@app.websocket("/ws/terminal")
async def ws_terminal(ws: WebSocket):
    await ws.accept()
    q = events.add_ws_client()
    try:
        # Task to forward events to client
        async def sender():
            try:
                while True:
                    msg = await q.get()
                    await ws.send_text(msg)
            except Exception:
                pass

        send_task = asyncio.create_task(sender())

        # Receive commands from client
        try:
            while True:
                data = await ws.receive_json()
                cmd = data.get("cmd", "")
                if data.get("type") == "run" and cmd:
                    api.run_command(cmd)
                elif data.get("type") == "bulk_run":
                    api.bulk_run(data.get("profiles", []), cmd)
        except WebSocketDisconnect:
            pass
        finally:
            send_task.cancel()
    finally:
        events.remove_ws_client(q)


# --- POST endpoints ---

@app.post("/api/activate")
async def activate(req: ActivateRequest):
    return api.activate(req.name)


@app.post("/api/run")
async def run_command(req: RunCommandRequest):
    return api.run_command(req.cmd)


@app.post("/api/bulk_run")
async def bulk_run(req: BulkRunRequest):
    return api.bulk_run(req.profiles, req.cmd)


@app.post("/api/save_profile")
async def save_profile(request: Request):
    # Uses raw dict because legacy sends _orig_name/_cat_id with leading underscores
    body = await request.json()
    return api.save_profile(body)


@app.post("/api/delete_profile")
async def delete_profile(req: DeleteProfileRequest):
    return api.delete_profile(req.name)


@app.post("/api/validate_name")
async def validate_name(req: ValidateNameRequest):
    return {"result": api.validate_name(req.name)}


@app.post("/api/set_profile_category")
async def set_profile_category(req: SetProfileCategoryRequest):
    return api.set_profile_category(req.profile, req.cat_id)


@app.post("/api/toggle_collapsed")
async def toggle_collapsed(req: ToggleCollapsedRequest):
    return api.toggle_collapsed(req.cid)


@app.post("/api/add_category")
async def add_category(req: AddCategoryRequest):
    return api.add_category(req.name, req.color)


@app.post("/api/edit_category")
async def edit_category(req: EditCategoryRequest):
    return api.edit_category(req.cid, req.name, req.color)


@app.post("/api/delete_category")
async def delete_category(req: DeleteCategoryRequest):
    return api.delete_category(req.cid)


@app.post("/api/add_favorite")
async def add_favorite(req: AddFavoriteRequest):
    return api.add_favorite(req.label, req.cmd)


@app.post("/api/remove_favorite")
async def remove_favorite(req: RemoveFavoriteRequest):
    return api.remove_favorite(req.cmd)


@app.post("/api/save_config")
async def save_config():
    return api.save_config()


@app.post("/api/reload")
async def reload_config():
    return api.reload_config()


@app.post("/api/set_theme")
async def set_theme(req: SetThemeRequest):
    return api.set_theme(req.theme)


@app.post("/api/discover_services")
async def discover_services(req: DiscoverServicesRequest):
    return api.discover_services(req.profile)


@app.post("/api/get_cost")
async def get_cost(req: GetCostRequest):
    return api.get_cost(req.profile, req.year, req.month)


@app.post("/api/fetch_cost_badges")
async def fetch_cost_badges():
    return api.fetch_cost_badges()


@app.post("/api/set_encoding")
async def set_encoding(req: SetEncodingRequest):
    return api.set_encoding(req.encoding)


@app.post("/api/discover_sso_accounts")
async def discover_sso_accounts(req: DiscoverSsoRequest):
    return api.discover_sso_accounts(req.sso_start_url)


@app.post("/api/import_sso_accounts")
async def import_sso_accounts(req: ImportSsoAccountsRequest):
    return api.import_sso_accounts(req.accounts)


@app.post("/api/import")
async def import_json(request: Request):
    body = await request.json()
    return api.import_json(body)


# --- Infrastructure Diagram endpoints ---

@app.post("/api/infra_scan")
async def infra_scan(req: InfraScanRequest):
    return api.infra_scan(req.profile, req.region, req.services)


@app.post("/api/infra_diagram")
async def infra_diagram(req: InfraDiagramRequest):
    return api.generate_diagram(req.graph, req.layout_mode, req.format, req.llm_result)


@app.post("/api/infra_llm_layout")
async def infra_llm_layout(req: InfraLlmLayoutRequest):
    return api.infra_llm_layout(req.graph)


# --- AI / LLM endpoints ---

@app.post("/api/ai_generate")
async def ai_generate(req: AiGenerateRequest):
    return api.ai_generate(req.message)


@app.get("/api/llm_config")
async def get_llm_config():
    return api.get_llm_config()


@app.post("/api/save_llm_config")
async def save_llm_config(req: SaveLlmConfigRequest):
    return api.save_llm_config({"providers": req.providers, "default_provider": req.default_provider})


@app.post("/api/test_llm_provider")
async def test_llm_provider(req: TestLlmProviderRequest):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, api.test_llm_provider, req.provider_type, req.config)


# --- SPA static files & catch-all ---

if STATIC_DIR.exists():
    from fastapi.staticfiles import StaticFiles

    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def spa_catch_all(full_path: str):
        """Serve SPA index.html for all non-API routes."""
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"))
