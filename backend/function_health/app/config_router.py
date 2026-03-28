from fastapi import APIRouter, Body, HTTPException, Header, Depends
from typing import Optional, Dict, Any, List
from .repositories.factory import get_repository
from .models import ServicesConfig, ServiceConfig, StoredConfig
from pydantic import ValidationError
from .models_strict import ServicesConfigStrict
from shared.auth.roles import admin_only, auth_only

router = APIRouter()

def _repo_dep():
    repo = get_repository()
    if repo is None:
        raise HTTPException(status_code=501, detail="Config repository not configured (set CONFIG_REPOSITORY_KIND).")
    return repo

@router.get("/health/config", response_model=StoredConfig)
async def get_config(repo=Depends(_repo_dep), user=Depends(auth_only)):
    cfg, etag = await repo.get_config()
    return {"etag": etag, "config": cfg}

@router.put("/health/config", response_model=StoredConfig)
async def put_config(
    cfg: ServicesConfig,
    if_match: Optional[str] = Header(None, convert_underscores=False),
    repo=Depends(_repo_dep),
    user=Depends(admin_only)
):
    try:
        new_etag = await repo.save_config(cfg.dict(), etag=if_match)
        new_cfg, _ = await repo.get_config()
        return {"etag": new_etag, "config": new_cfg}
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.get("/health/config/services", response_model=List[ServiceConfig])
async def list_services(repo=Depends(_repo_dep), user=Depends(auth_only)):
    cfg, _ = await repo.get_config()
    return cfg.get("services", [])

@router.get("/health/config/services/{name}", response_model=ServiceConfig)
async def get_service(name: str, repo=Depends(_repo_dep), user=Depends(auth_only)):
    cfg, _ = await repo.get_config()
    for s in cfg.get("services", []):
        if s.get("name") == name:
            return s
    raise HTTPException(status_code=404, detail="Service not found")

@router.post("/health/config/services", response_model=ServiceConfig, status_code=201)
async def add_service(svc: ServiceConfig, if_match: Optional[str] = Header(None, convert_underscores=False), repo=Depends(_repo_dep), user=Depends(admin_only)):
    cfg, etag = await repo.get_config()
    # ensure unique name
    names = {s.get("name") for s in cfg.get("services", [])}
    if svc.name in names:
        raise HTTPException(status_code=409, detail="Service with this name already exists")
    cfg.setdefault("services", []).append(svc.dict())
    try:
        new_etag = await repo.save_config(cfg, etag=if_match or etag)
        return svc
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.put("/health/config/services/{name}", response_model=ServiceConfig)
async def update_service(name: str, svc: ServiceConfig, if_match: Optional[str] = Header(None, convert_underscores=False), repo=Depends(_repo_dep), user=Depends(admin_only)):
    cfg, etag = await repo.get_config()
    services = cfg.get("services", [])
    for i, s in enumerate(services):
        if s.get("name") == name:
            services[i] = svc.dict()
            try:
                await repo.save_config(cfg, etag=if_match or etag)
                return svc
            except Exception as e:
                raise HTTPException(status_code=409, detail=str(e))
    raise HTTPException(status_code=404, detail="Service not found")

@router.delete("/health/config/services/{name}", status_code=204)
async def delete_service(name: str, if_match: Optional[str] = Header(None, convert_underscores=False), repo=Depends(_repo_dep), user=Depends(admin_only)):
    cfg, etag = await repo.get_config()
    services = cfg.get("services", [])
    new_services = [s for s in services if s.get("name") != name]
    if len(new_services) == len(services):
        raise HTTPException(status_code=404, detail="Service not found")
    cfg["services"] = new_services
    try:
        await repo.save_config(cfg, etag=if_match or etag)
        return
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))
    
@router.get("/health/config/schema")
async def get_config_schema(user=Depends(auth_only)):
    # Pydantic v2 JSON Schema (Draft 2020-12)
    return ServicesConfigStrict.model_json_schema()

@router.post("/health/config/validate")
async def validate_config(payload: dict = Body(...), user=Depends(auth_only)):
    try:
        ServicesConfigStrict.model_validate(payload)
        return {"ok": True, "errors": []}
    except ValidationError as ve:
        # shape as list of {loc, msg}
        errs = [{"loc": list(err["loc"]), "msg": err["msg"]} for err in ve.errors()]
        return {"ok": False, "errors": errs}
