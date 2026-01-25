"""
Accounting service for category seeding and business logic
"""

import uuid
import logging
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import AccountingCategory

logger = logging.getLogger(__name__)

# Default categories as specified in the accounting spec
DEFAULT_CATEGORIES = {
    "income": [
        {"name": "Salary", "icon": "banknote", "color": "#10B981"},
        {"name": "Freelance", "icon": "briefcase", "color": "#3B82F6"},
        {"name": "Sales", "icon": "shopping-bag", "color": "#8B5CF6"},
        {"name": "Investments", "icon": "trending-up", "color": "#F59E0B"},
        {"name": "Gifts", "icon": "gift", "color": "#EC4899"},
        {"name": "Other Income", "icon": "plus-circle", "color": "#6B7280"},
    ],
    "expense": [
        {
            "name": "Housing",
            "icon": "home",
            "color": "#EF4444",
            "children": ["Rent/Mortgage", "Utilities", "Maintenance", "Garden"],
        },
        {
            "name": "Food",
            "icon": "utensils",
            "color": "#F97316",
            "children": ["Groceries", "Dining Out"],
        },
        {
            "name": "Transportation",
            "icon": "car",
            "color": "#84CC16",
            "children": ["Car", "Bike", "Public Transportation", "Travel tickets"],
        },
        {
            "name": "Insurance",
            "icon": "shield",
            "color": "#06B6D4",
            "children": ["Health insurance", "Property insurance", "Liability insurance"],
        },
        {
            "name": "Administrative",
            "icon": "file-text",
            "color": "#6366F1",
            "children": ["Taxes", "Bank fees", "Interest payments", "Legal expenses"],
        },
        {
            "name": "Professional",
            "icon": "laptop",
            "color": "#8B5CF6",
            "children": ["Hardware", "Software", "AI tokens"],
        },
        {
            "name": "Shopping",
            "icon": "shopping-cart",
            "color": "#EC4899",
            "children": ["Clothing", "Electronics", "Household"],
        },
        {
            "name": "Education",
            "icon": "book-open",
            "color": "#14B8A6",
            "children": ["Classes", "Materials"],
        },
        {
            "name": "Family",
            "icon": "users",
            "color": "#F43F5E",
            "children": ["Daycare", "Babysitting", "School fees"],
        },
        {
            "name": "Personal Care",
            "icon": "heart",
            "color": "#D946EF",
            "children": ["Medicine", "Supplements", "Cosmetics", "Hairdresser", "Girlstuff"],
        },
        {
            "name": "Hobby",
            "icon": "palette",
            "color": "#A855F7",
            "children": ["Art stuff", "Photography", "Sports"],
        },
        {
            "name": "Entertainment",
            "icon": "tv",
            "color": "#22C55E",
            "children": ["Subscriptions", "Party", "Drugs", "Video games"],
        },
        {
            "name": "Investments",
            "icon": "piggy-bank",
            "color": "#EAB308",
            "children": ["Stocks", "Minerals", "Real Estate", "Crypto"],
        },
        {
            "name": "Other Expenses",
            "icon": "more-horizontal",
            "color": "#6B7280",
            "children": ["Family Support", "Gifts", "Donations", "Loans", "Lost"],
        },
    ],
}


async def seed_default_categories(session: AsyncSession) -> bool:
    """
    Seed default accounting categories globally (shared across all users).
    Only seeds if no categories exist yet.

    Args:
        session: SQLAlchemy async session

    Returns:
        True if categories were seeded, False if they already existed
    """
    # Check if categories already exist
    result = await session.execute(
        select(func.count()).select_from(AccountingCategory)
    )
    count = result.scalar()

    if count > 0:
        logger.debug(f"Accounting categories already exist ({count} found), skipping seed")
        return False

    logger.info("Seeding default accounting categories")

    sort_order = 0

    for category_type, categories in DEFAULT_CATEGORIES.items():
        for cat_data in categories:
            parent_id = str(uuid.uuid4())

            # Create parent category
            parent = AccountingCategory(
                id=parent_id,
                name=cat_data["name"],
                type=category_type,
                parentId=None,
                icon=cat_data.get("icon"),
                color=cat_data.get("color"),
                sortOrder=sort_order,
                isDefault=True,
            )
            session.add(parent)
            sort_order += 1

            # Create child categories if any
            children = cat_data.get("children", [])
            child_sort_order = 0
            for child_name in children:
                child = AccountingCategory(
                    id=str(uuid.uuid4()),
                    name=child_name,
                    type=category_type,
                    parentId=parent_id,
                    icon=None,
                    color=None,
                    sortOrder=child_sort_order,
                    isDefault=True,
                )
                session.add(child)
                child_sort_order += 1

    logger.info("Successfully seeded default accounting categories")
    return True
