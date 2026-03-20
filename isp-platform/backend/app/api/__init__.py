from fastapi import APIRouter
from .clients import router as clients_router
from .mst import router as mst_router
from .fibre import router as fibre_router
from .map import router as map_router
from .auth import router as auth_router
from .activity import router as activity_router
from .dashboard import router as dashboard_router
from .seed import router as seed_router
from .network import router as network_router
from .billing import router as billing_router
from .tickets import router as tickets_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(clients_router)
api_router.include_router(mst_router)
api_router.include_router(fibre_router)
api_router.include_router(map_router)
api_router.include_router(activity_router)
api_router.include_router(dashboard_router)
api_router.include_router(seed_router)
api_router.include_router(network_router)
api_router.include_router(billing_router)
api_router.include_router(tickets_router)

__all__ = ["api_router"]
