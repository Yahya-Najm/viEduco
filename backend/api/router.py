from fastapi import APIRouter, Depends

from api.deps import require_internal_key
from api.routes.transcribe import router as transcribe_router
from api.routes.storage import router as storage_router
from api.routes.protocol import router as protocol_router

router = APIRouter(dependencies=[Depends(require_internal_key)])

router.include_router(transcribe_router)
router.include_router(storage_router)
router.include_router(protocol_router)
