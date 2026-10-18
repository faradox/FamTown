"""
Accounting API endpoints for categories, entries, and templates

Categories are global (shared across all users).
Entries and templates are also shared - userId is stored for audit but not exposed or filtered.
"""

import uuid
import logging
from datetime import date as date_type, datetime
from decimal import Decimal
from typing import Optional, List, Literal
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, update, func, and_, or_
from sqlalchemy.orm import selectinload, aliased

from database import db_manager, User, AccountingCategory, AccountingEntry, AccountingTemplate
from app.services.auth_service import get_current_user
from app.services.websocket_service import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/accounting", tags=["accounting"])


# ============ PYDANTIC SCHEMAS ============

# Amount columns are Numeric(12, 2): at most 10 integer digits
MAX_AMOUNT = Decimal("10000000000")

# Category schemas
class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=100)
    type: Literal["income", "expense"]
    parentId: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)
    sortOrder: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)
    sortOrder: Optional[int] = None


class CategoryReorderItem(BaseModel):
    id: str
    sortOrder: int


class CategoryReorder(BaseModel):
    items: List[CategoryReorderItem]


class CategoryResponse(BaseModel):
    id: str
    name: str
    type: str
    parentId: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    sortOrder: int
    isDefault: bool
    createdAt: str


# Entry schemas
class EntryCreate(BaseModel):
    entryType: Literal["income", "expense"]
    amount: Decimal = Field(..., gt=0, lt=MAX_AMOUNT)
    categoryId: str
    description: Optional[str] = Field(None, max_length=500)
    date: date_type
    templateId: Optional[str] = None


class EntryUpdate(BaseModel):
    entryType: Optional[Literal["income", "expense"]] = None
    amount: Optional[Decimal] = Field(None, gt=0, lt=MAX_AMOUNT)
    categoryId: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    date: Optional[date_type] = None


class EntryResponse(BaseModel):
    id: str
    entryType: str
    amount: str  # String for JSON serialization of Decimal
    categoryId: str
    categoryName: Optional[str] = None
    description: Optional[str]
    date: str
    templateId: Optional[str]
    createdAt: str
    updatedAt: str


class EntryListResponse(BaseModel):
    items: List[EntryResponse]
    total: int
    page: int
    pageSize: int
    totalPages: int


class CategorySummary(BaseModel):
    categoryId: str
    name: str
    total: str
    percentage: float


class DailyTotal(BaseModel):
    date: str
    income: str
    expense: str


class DailyCategoryTotal(BaseModel):
    date: str
    categoryId: str
    categoryName: str
    entryType: str
    total: str


class EntrySummaryResponse(BaseModel):
    period: dict
    totalIncome: str
    totalExpense: str
    net: str
    byCategory: List[CategorySummary]
    dailyTotals: List[DailyTotal]
    dailyCategoryTotals: List[DailyCategoryTotal]


# Template schemas
class TemplateCreate(BaseModel):
    name: str = Field(..., max_length=100)
    entryType: Literal["income", "expense"]
    amount: Optional[Decimal] = Field(None, gt=0, lt=MAX_AMOUNT)
    categoryId: str
    description: Optional[str] = Field(None, max_length=500)
    sortOrder: int = 0


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    entryType: Optional[Literal["income", "expense"]] = None
    amount: Optional[Decimal] = Field(None, gt=0, lt=MAX_AMOUNT)
    categoryId: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    sortOrder: Optional[int] = None


class TemplateApply(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, lt=MAX_AMOUNT)
    date: date_type
    description: Optional[str] = Field(None, max_length=500)


class TemplateResponse(BaseModel):
    id: str
    name: str
    entryType: str
    amount: Optional[str]
    categoryId: str
    categoryName: Optional[str] = None
    description: Optional[str]
    sortOrder: int
    createdAt: str


# ============ HELPER FUNCTIONS ============

def category_to_response(cat: AccountingCategory) -> CategoryResponse:
    return CategoryResponse(
        id=cat.id,
        name=cat.name,
        type=cat.type,
        parentId=cat.parentId,
        icon=cat.icon,
        color=cat.color,
        sortOrder=cat.sortOrder,
        isDefault=cat.isDefault,
        createdAt=cat.createdAt.isoformat() if cat.createdAt else None,
    )


def entry_to_response(entry: AccountingEntry, category_name: str = None) -> EntryResponse:
    return EntryResponse(
        id=entry.id,
        entryType=entry.entryType,
        amount=str(entry.amount),
        categoryId=entry.categoryId,
        categoryName=category_name,
        description=entry.description,
        date=entry.date.isoformat() if entry.date else None,
        templateId=entry.templateId,
        createdAt=entry.createdAt.isoformat() if entry.createdAt else None,
        updatedAt=entry.updatedAt.isoformat() if entry.updatedAt else None,
    )


def template_to_response(tmpl: AccountingTemplate, category_name: str = None) -> TemplateResponse:
    return TemplateResponse(
        id=tmpl.id,
        name=tmpl.name,
        entryType=tmpl.entryType,
        amount=str(tmpl.amount) if tmpl.amount is not None else None,
        categoryId=tmpl.categoryId,
        categoryName=category_name,
        description=tmpl.description,
        sortOrder=tmpl.sortOrder,
        createdAt=tmpl.createdAt.isoformat() if tmpl.createdAt else None,
    )


# ============ CATEGORY ENDPOINTS ============

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    type: Optional[Literal["income", "expense"]] = None,
    current_user: User = Depends(get_current_user),
):
    """List all categories, optionally filtered by type."""
    async with db_manager.get_session() as session:
        query = select(AccountingCategory)
        if type:
            query = query.where(AccountingCategory.type == type)
        query = query.order_by(AccountingCategory.sortOrder, AccountingCategory.name)

        result = await session.execute(query)
        categories = result.scalars().all()

        return [category_to_response(cat) for cat in categories]


@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new category. Validates parent depth (max 2 levels)."""
    async with db_manager.get_session() as session:
        # Validate parent if provided
        if data.parentId:
            result = await session.execute(
                select(AccountingCategory).where(
                    AccountingCategory.id == data.parentId,
                )
            )
            parent = result.scalar_one_or_none()
            if not parent:
                raise HTTPException(status_code=404, detail="Parent category not found")
            if parent.parentId is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot create subcategory of a subcategory (max 2 levels)",
                )
            if parent.type != data.type:
                raise HTTPException(
                    status_code=400,
                    detail="Parent category type must match",
                )

        category_id = str(uuid.uuid4())
        category = AccountingCategory(
            id=category_id,
            name=data.name,
            type=data.type,
            parentId=data.parentId,
            icon=data.icon,
            color=data.color,
            sortOrder=data.sortOrder,
            isDefault=False,
        )

        session.add(category)
        await session.commit()
        await session.refresh(category)

        response = category_to_response(category)
        await ws_manager.send_object_created("accounting_category", response.dict())
        return response


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update a category."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingCategory).where(
                AccountingCategory.id == category_id,
            )
        )
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        if data.name is not None:
            category.name = data.name
        if data.icon is not None:
            category.icon = data.icon
        if data.color is not None:
            category.color = data.color
        if data.sortOrder is not None:
            category.sortOrder = data.sortOrder

        await session.commit()
        await session.refresh(category)

        response = category_to_response(category)
        await ws_manager.send_object_updated("accounting_category", response.dict())
        return response


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a category. Blocked if it has children or entries."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingCategory).where(
                AccountingCategory.id == category_id,
            )
        )
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # Check for children
        result = await session.execute(
            select(func.count()).select_from(AccountingCategory).where(
                AccountingCategory.parentId == category_id
            )
        )
        child_count = result.scalar()
        if child_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete category with subcategories",
            )

        # Check for entries
        result = await session.execute(
            select(func.count()).select_from(AccountingEntry).where(
                AccountingEntry.categoryId == category_id
            )
        )
        entry_count = result.scalar()
        if entry_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete category with existing entries",
            )

        # Check for templates
        result = await session.execute(
            select(func.count()).select_from(AccountingTemplate).where(
                AccountingTemplate.categoryId == category_id
            )
        )
        template_count = result.scalar()
        if template_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete category used by templates",
            )

        await session.execute(
            delete(AccountingCategory).where(AccountingCategory.id == category_id)
        )
        await session.commit()

        await ws_manager.send_object_deleted("accounting_category", category_id)
        return {"success": True, "message": "Category deleted"}


@router.post("/categories/reorder")
async def reorder_categories(
    data: CategoryReorder,
    current_user: User = Depends(get_current_user),
):
    """Batch update sort order for categories."""
    async with db_manager.get_session() as session:
        for item in data.items:
            result = await session.execute(
                select(AccountingCategory).where(
                    AccountingCategory.id == item.id,
                )
            )
            category = result.scalar_one_or_none()
            if category:
                category.sortOrder = item.sortOrder

        await session.commit()
        return {"success": True, "message": "Categories reordered"}


# ============ ENTRY ENDPOINTS ============

@router.get("/entries", response_model=EntryListResponse)
async def list_entries(
    type: Optional[Literal["income", "expense"]] = None,
    categoryId: Optional[str] = None,
    fromDate: Optional[date_type] = Query(None, alias="from_date"),
    toDate: Optional[date_type] = Query(None, alias="to_date"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100, alias="page_size"),
    sort: str = Query("date_desc"),
    current_user: User = Depends(get_current_user),
):
    """List entries with pagination and filtering (shared across all users)."""
    async with db_manager.get_session() as session:
        # Base query - no user filtering, entries are shared
        query = select(AccountingEntry)

        # Apply filters
        if type:
            query = query.where(AccountingEntry.entryType == type)

        if categoryId:
            # Include entries from children of this category too
            result = await session.execute(
                select(AccountingCategory.id).where(
                    or_(
                        AccountingCategory.id == categoryId,
                        AccountingCategory.parentId == categoryId,
                    ),
                )
            )
            category_ids = [row[0] for row in result.all()]
            # Unknown category: in_([]) matches nothing instead of dropping the filter
            query = query.where(AccountingEntry.categoryId.in_(category_ids))

        if fromDate:
            query = query.where(AccountingEntry.date >= fromDate)
        if toDate:
            query = query.where(AccountingEntry.date <= toDate)

        if search:
            query = query.where(
                AccountingEntry.description.ilike(f"%{search}%")
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        result = await session.execute(count_query)
        total = result.scalar()

        # Apply sorting
        if sort == "date_asc":
            query = query.order_by(AccountingEntry.date.asc())
        elif sort == "amount_desc":
            query = query.order_by(AccountingEntry.amount.desc())
        elif sort == "amount_asc":
            query = query.order_by(AccountingEntry.amount.asc())
        else:  # date_desc (default)
            query = query.order_by(AccountingEntry.date.desc())

        # Apply pagination
        offset = (page - 1) * pageSize
        query = query.offset(offset).limit(pageSize)

        result = await session.execute(query)
        entries = result.scalars().all()

        # Get category names
        if entries:
            cat_ids = list(set(e.categoryId for e in entries))
            cat_result = await session.execute(
                select(AccountingCategory).where(AccountingCategory.id.in_(cat_ids))
            )
            cat_map = {c.id: c.name for c in cat_result.scalars().all()}
        else:
            cat_map = {}

        items = [
            entry_to_response(e, cat_map.get(e.categoryId))
            for e in entries
        ]

        total_pages = (total + pageSize - 1) // pageSize if total > 0 else 1

        return EntryListResponse(
            items=items,
            total=total,
            page=page,
            pageSize=pageSize,
            totalPages=total_pages,
        )


@router.post("/entries", response_model=EntryResponse)
async def create_entry(
    data: EntryCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new entry."""
    async with db_manager.get_session() as session:
        # Validate category
        result = await session.execute(
            select(AccountingCategory).where(
                AccountingCategory.id == data.categoryId,
            )
        )
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        if category.type != data.entryType:
            raise HTTPException(
                status_code=400,
                detail="Category type must match entry type",
            )

        # Validate template if provided
        if data.templateId:
            result = await session.execute(
                select(AccountingTemplate).where(
                    AccountingTemplate.id == data.templateId,
                )
            )
            template = result.scalar_one_or_none()
            if not template:
                raise HTTPException(status_code=404, detail="Template not found")

        entry_id = str(uuid.uuid4())
        entry = AccountingEntry(
            id=entry_id,
            entryType=data.entryType,
            amount=data.amount,
            categoryId=data.categoryId,
            description=data.description,
            date=data.date,
            userId=current_user.id,  # Store for audit, not exposed in response
            templateId=data.templateId,
        )

        session.add(entry)
        await session.commit()
        await session.refresh(entry)

        response = entry_to_response(entry, category.name)
        await ws_manager.send_object_created("accounting_entry", response.dict())
        return response


@router.put("/entries/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: str,
    data: EntryUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update an entry."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingEntry).where(
                AccountingEntry.id == entry_id,
            )
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        # Get current entry type for validation
        entry_type = data.entryType if data.entryType else entry.entryType

        # Validate category if changing
        if data.categoryId:
            result = await session.execute(
                select(AccountingCategory).where(
                    AccountingCategory.id == data.categoryId,
                )
            )
            category = result.scalar_one_or_none()
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            if category.type != entry_type:
                raise HTTPException(
                    status_code=400,
                    detail="Category type must match entry type",
                )

        if data.entryType is not None:
            entry.entryType = data.entryType
        if data.amount is not None:
            entry.amount = data.amount
        if data.categoryId is not None:
            entry.categoryId = data.categoryId
        if data.description is not None:
            entry.description = data.description
        if data.date is not None:
            entry.date = data.date

        await session.commit()
        await session.refresh(entry)

        # Get category name
        result = await session.execute(
            select(AccountingCategory).where(AccountingCategory.id == entry.categoryId)
        )
        cat = result.scalar_one_or_none()
        cat_name = cat.name if cat else None

        response = entry_to_response(entry, cat_name)
        await ws_manager.send_object_updated("accounting_entry", response.dict())
        return response


@router.delete("/entries/{entry_id}")
async def delete_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an entry."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingEntry).where(
                AccountingEntry.id == entry_id,
            )
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        await session.execute(
            delete(AccountingEntry).where(AccountingEntry.id == entry_id)
        )
        await session.commit()

        await ws_manager.send_object_deleted("accounting_entry", entry_id)
        return {"success": True, "message": "Entry deleted"}


@router.get("/entries/summary", response_model=EntrySummaryResponse)
async def get_entries_summary(
    fromDate: date_type = Query(..., alias="from_date"),
    toDate: date_type = Query(..., alias="to_date"),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated summary for dashboard (shared across all users)."""
    async with db_manager.get_session() as session:
        # Get totals by type - no user filtering
        result = await session.execute(
            select(
                AccountingEntry.entryType,
                func.sum(AccountingEntry.amount).label("total"),
            )
            .where(
                AccountingEntry.date >= fromDate,
                AccountingEntry.date <= toDate,
            )
            .group_by(AccountingEntry.entryType)
        )
        totals = {row.entryType: row.total or Decimal("0") for row in result.all()}

        total_income = totals.get("income", Decimal("0"))
        total_expense = totals.get("expense", Decimal("0"))
        net = total_income - total_expense

        # Get totals by category (expense only for pie chart)
        result = await session.execute(
            select(
                AccountingEntry.categoryId,
                AccountingCategory.name,
                func.sum(AccountingEntry.amount).label("total"),
            )
            .join(AccountingCategory, AccountingEntry.categoryId == AccountingCategory.id)
            .where(
                AccountingEntry.date >= fromDate,
                AccountingEntry.date <= toDate,
                AccountingEntry.entryType == "expense",
            )
            .group_by(AccountingEntry.categoryId, AccountingCategory.name)
            .order_by(func.sum(AccountingEntry.amount).desc())
        )
        by_category_raw = result.all()

        by_category = []
        for row in by_category_raw:
            pct = (
                float(row.total / total_expense * 100) if total_expense > 0 else 0
            )
            by_category.append(
                CategorySummary(
                    categoryId=row.categoryId,
                    name=row.name,
                    total=str(row.total),
                    percentage=round(pct, 1),
                )
            )

        # Get daily totals
        result = await session.execute(
            select(
                AccountingEntry.date,
                AccountingEntry.entryType,
                func.sum(AccountingEntry.amount).label("total"),
            )
            .where(
                AccountingEntry.date >= fromDate,
                AccountingEntry.date <= toDate,
            )
            .group_by(AccountingEntry.date, AccountingEntry.entryType)
            .order_by(AccountingEntry.date)
        )
        daily_raw = result.all()

        # Build daily totals map
        daily_map = {}
        for row in daily_raw:
            d = row.date.isoformat()
            if d not in daily_map:
                daily_map[d] = {"income": Decimal("0"), "expense": Decimal("0")}
            daily_map[d][row.entryType] = row.total

        daily_totals = [
            DailyTotal(
                date=d,
                income=str(daily_map[d]["income"]),
                expense=str(daily_map[d]["expense"]),
            )
            for d in sorted(daily_map.keys())
        ]

        # Get daily totals by top-level category
        child_category = aliased(AccountingCategory)
        parent_category = aliased(AccountingCategory)
        top_category_id = func.coalesce(parent_category.id, child_category.id).label(
            "category_id"
        )
        top_category_name = func.coalesce(
            parent_category.name, child_category.name
        ).label("category_name")
        result = await session.execute(
            select(
                AccountingEntry.date,
                top_category_id,
                top_category_name,
                AccountingEntry.entryType,
                func.sum(AccountingEntry.amount).label("total"),
            )
            .join(child_category, AccountingEntry.categoryId == child_category.id)
            .outerjoin(parent_category, child_category.parentId == parent_category.id)
            .where(
                AccountingEntry.date >= fromDate,
                AccountingEntry.date <= toDate,
            )
            .group_by(
                AccountingEntry.date,
                top_category_id,
                top_category_name,
                AccountingEntry.entryType,
            )
            .order_by(AccountingEntry.date)
        )
        daily_category_totals = [
            DailyCategoryTotal(
                date=row.date.isoformat(),
                categoryId=row.category_id,
                categoryName=row.category_name,
                entryType=row.entryType,
                total=str(row.total),
            )
            for row in result.all()
        ]

        return EntrySummaryResponse(
            period={"from": fromDate.isoformat(), "to": toDate.isoformat()},
            totalIncome=str(total_income),
            totalExpense=str(total_expense),
            net=str(net),
            byCategory=by_category,
            dailyTotals=daily_totals,
            dailyCategoryTotals=daily_category_totals,
        )


# ============ TEMPLATE ENDPOINTS ============

@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
):
    """List all templates (shared across all users)."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingTemplate)
            .order_by(AccountingTemplate.sortOrder, AccountingTemplate.name)
        )
        templates = result.scalars().all()

        # Get category names
        if templates:
            cat_ids = list(set(t.categoryId for t in templates))
            cat_result = await session.execute(
                select(AccountingCategory).where(AccountingCategory.id.in_(cat_ids))
            )
            cat_map = {c.id: c.name for c in cat_result.scalars().all()}
        else:
            cat_map = {}

        return [
            template_to_response(t, cat_map.get(t.categoryId))
            for t in templates
        ]


@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new template."""
    async with db_manager.get_session() as session:
        # Validate category
        result = await session.execute(
            select(AccountingCategory).where(
                AccountingCategory.id == data.categoryId,
            )
        )
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        if category.type != data.entryType:
            raise HTTPException(
                status_code=400,
                detail="Category type must match entry type",
            )

        # Check for duplicate name (globally, since templates are shared)
        result = await session.execute(
            select(AccountingTemplate).where(
                AccountingTemplate.name == data.name,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Template with this name already exists",
            )

        template_id = str(uuid.uuid4())
        template = AccountingTemplate(
            id=template_id,
            name=data.name,
            entryType=data.entryType,
            amount=data.amount,
            categoryId=data.categoryId,
            description=data.description,
            userId=current_user.id,  # Store for audit, not exposed
            sortOrder=data.sortOrder,
        )

        session.add(template)
        await session.commit()
        await session.refresh(template)

        response = template_to_response(template, category.name)
        await ws_manager.send_object_created("accounting_template", response.dict())
        return response


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    data: TemplateUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update a template."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingTemplate).where(
                AccountingTemplate.id == template_id,
            )
        )
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Get current entry type for validation
        entry_type = data.entryType if data.entryType else template.entryType

        # Validate category if changing
        if data.categoryId:
            result = await session.execute(
                select(AccountingCategory).where(
                    AccountingCategory.id == data.categoryId,
                )
            )
            category = result.scalar_one_or_none()
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            if category.type != entry_type:
                raise HTTPException(
                    status_code=400,
                    detail="Category type must match entry type",
                )

        # Check for duplicate name if changing
        if data.name and data.name != template.name:
            result = await session.execute(
                select(AccountingTemplate).where(
                    AccountingTemplate.name == data.name,
                )
            )
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail="Template with this name already exists",
                )

        if data.name is not None:
            template.name = data.name
        if data.entryType is not None:
            template.entryType = data.entryType
        if data.amount is not None:
            template.amount = data.amount
        if data.categoryId is not None:
            template.categoryId = data.categoryId
        if data.description is not None:
            template.description = data.description
        if data.sortOrder is not None:
            template.sortOrder = data.sortOrder

        await session.commit()
        await session.refresh(template)

        # Get category name
        result = await session.execute(
            select(AccountingCategory).where(AccountingCategory.id == template.categoryId)
        )
        cat = result.scalar_one_or_none()
        cat_name = cat.name if cat else None

        response = template_to_response(template, cat_name)
        await ws_manager.send_object_updated("accounting_template", response.dict())
        return response


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a template."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingTemplate).where(
                AccountingTemplate.id == template_id,
            )
        )
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Detach entries first: tables made by create_all lack ON DELETE SET NULL
        await session.execute(
            update(AccountingEntry)
            .where(AccountingEntry.templateId == template_id)
            .values(templateId=None)
        )
        await session.execute(
            delete(AccountingTemplate).where(AccountingTemplate.id == template_id)
        )
        await session.commit()

        await ws_manager.send_object_deleted("accounting_template", template_id)
        return {"success": True, "message": "Template deleted"}


@router.post("/templates/{template_id}/apply", response_model=EntryResponse)
async def apply_template(
    template_id: str,
    data: TemplateApply,
    current_user: User = Depends(get_current_user),
):
    """Create an entry from a template."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(AccountingTemplate).where(
                AccountingTemplate.id == template_id,
            )
        )
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Determine amount
        amount = data.amount if data.amount is not None else template.amount
        if amount is None:
            raise HTTPException(
                status_code=400,
                detail="Amount is required (template has no default amount)",
            )

        # Determine description
        description = data.description if data.description is not None else template.description

        entry_id = str(uuid.uuid4())
        entry = AccountingEntry(
            id=entry_id,
            entryType=template.entryType,
            amount=amount,
            categoryId=template.categoryId,
            description=description,
            date=data.date,
            userId=current_user.id,  # Store for audit
            templateId=template_id,
        )

        session.add(entry)
        await session.commit()
        await session.refresh(entry)

        # Get category name
        result = await session.execute(
            select(AccountingCategory).where(AccountingCategory.id == entry.categoryId)
        )
        cat = result.scalar_one_or_none()
        cat_name = cat.name if cat else None

        response = entry_to_response(entry, cat_name)
        await ws_manager.send_object_created("accounting_entry", response.dict())
        return response
