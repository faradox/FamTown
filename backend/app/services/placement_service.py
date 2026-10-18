"""
Cleanup of townsquare/profile placements that reference a deleted object
"""

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import TownsquareItem, ProfileItem
from app.services.websocket_service import ws_manager


async def remove_placements(session: AsyncSession, object_type: str, object_id: str) -> dict:
    """
    Delete all townsquare and profile items pointing at an object.
    The caller commits, then passes the result to broadcast_placement_removals.
    """
    ts_result = await session.execute(
        select(TownsquareItem.id).where(
            TownsquareItem.objectType == object_type,
            TownsquareItem.objectId == object_id,
        )
    )
    townsquare_ids = list(ts_result.scalars().all())

    profile_result = await session.execute(
        select(ProfileItem.id, ProfileItem.userId).where(
            ProfileItem.objectType == object_type,
            ProfileItem.objectId == object_id,
        )
    )
    profile_items = [(row.id, row.userId) for row in profile_result.all()]

    if townsquare_ids:
        await session.execute(delete(TownsquareItem).where(TownsquareItem.id.in_(townsquare_ids)))
    if profile_items:
        await session.execute(
            delete(ProfileItem).where(ProfileItem.id.in_([item_id for item_id, _ in profile_items]))
        )

    return {"townsquare": townsquare_ids, "profile": profile_items}


async def broadcast_placement_removals(removed: dict):
    """Tell clients about placements removed by remove_placements"""
    for item_id in removed["townsquare"]:
        await ws_manager.send_townsquare_updated({"deleted": item_id})
    for item_id, user_id in removed["profile"]:
        await ws_manager.send_profile_updated(user_id, {"deleted": item_id})
