# Accounting Feature Guide

## Overview

The Accounting feature is a fully implemented, family-shared bookkeeping dashboard. It provides a monthly overview (summary cards + charts), quick entry, recent entries, full entry history with filters, category management, and reusable templates. All data is shared across the household; `userId` is captured for audit only and is not used to filter results.

## What’s Implemented

- **Dashboard**: summary cards, expenses pie chart, income/expense trend chart, quick entry form, recent entries list.
- **Entries**: paginated list with filters, edit/delete inline, search on description.
- **Categories**: two-level tree view with colors and icons, reorder API, deletion protection.
- **Templates**: create/edit/delete templates and quick-apply to entries.
- **Real-time updates**: WebSocket broadcasts for category/entry/template mutations.

## Data Model (Shared)

All accounting entities are shared across the family. `userId` is stored for audit only.

### Tables

- `accounting_categories`: parent/child hierarchy (max 2 levels), `type` is `income` or `expense`, optional `icon`, `color`, `sortOrder`, `isDefault`.
- `accounting_entries`: `entryType`, `amount` (positive), `date`, `categoryId`, `description`, `templateId`, `accountId` (reserved).
- `accounting_templates`: quick-entry templates with optional default `amount` and `description`.

### Key Rules

- Category depth is limited to two levels (parent + child).
- Category `type` must match entry/template `entryType`.
- Amounts are stored as positive values; `entryType` determines direction.
- Template names are enforced as globally unique at the API layer.
- Delete protections: categories cannot be removed if used by entries/templates or have children.

## Backend Implementation

### Models

- `backend/database.py` defines `AccountingCategory`, `AccountingEntry`, `AccountingTemplate`.
- `accountId` is reserved in `AccountingEntry` for future account support.

### API Router

All endpoints are implemented in `backend/app/api/accounting.py` and mounted in `backend/main.py`.

**Categories**

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/accounting/categories` | Optional `type=income|expense` |
| POST | `/api/accounting/categories` | Validates parent depth/type |
| PUT | `/api/accounting/categories/{id}` | Updates name/icon/color/sortOrder |
| DELETE | `/api/accounting/categories/{id}` | Blocked if children/entries/templates |
| POST | `/api/accounting/categories/reorder` | Batch update `sortOrder` |

**Entries**

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/accounting/entries` | Filters + pagination |
| POST | `/api/accounting/entries` | Validates category + template |
| PUT | `/api/accounting/entries/{id}` | Validates category type if changed |
| DELETE | `/api/accounting/entries/{id}` | Removes entry |
| GET | `/api/accounting/entries/summary` | Requires `from_date`, `to_date` |

**Entry List Query Params**

- `type`: `income` or `expense`
- `categoryId`: parent or child category (includes children if parent)
- `from_date`, `to_date`: ISO date range
- `search`: case-insensitive match on description
- `page`, `page_size`: pagination (default 50)
- `sort`: `date_desc` (default), `date_asc`, `amount_desc`, `amount_asc`

**Summary Response Notes**

- `byCategory` aggregates **expense** totals only for the pie chart.
- `dailyTotals` includes both income and expense totals per day.

**Templates**

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/accounting/templates` | Sorted by `sortOrder`, `name` |
| POST | `/api/accounting/templates` | Validates category + unique name |
| PUT | `/api/accounting/templates/{id}` | Validates category type, unique name |
| DELETE | `/api/accounting/templates/{id}` | Removes template |
| POST | `/api/accounting/templates/{id}/apply` | Creates entry from template |

### Seeding

- Default categories are defined in `backend/app/services/accounting_service.py`.
- `backend/main.py` calls `seed_default_categories` on startup to seed once.

### WebSocket Events

Mutations call `ws_manager.send_object_*` with:

- `accounting_category`
- `accounting_entry`
- `accounting_template`

### Migration

- `backend/alembic/versions/a1b2c3d4e5f6_add_accounting_tables.py` creates the accounting tables and indexes.

## Frontend Implementation

### Routes

Routes are defined in `frontend/src/App.jsx`:

- `/accounting` → `AccountingPage`
- `/accounting/entries` → `EntriesPage`
- `/accounting/categories` → `CategoriesPage`
- `/accounting/templates` → `TemplatesPage`

### Pages

- `frontend/src/pages/AccountingPage.jsx`: dashboard + quick entry, loads summary and recent entries.
- `frontend/src/pages/EntriesPage.jsx`: filters, pagination, edit modal, delete flow.
- `frontend/src/pages/CategoriesPage.jsx`: tree view with create/edit/delete and color presets.
- `frontend/src/pages/TemplatesPage.jsx`: create/edit/delete templates and display grouped by type.

### Components

- `frontend/src/components/accounting/QuickEntryForm.jsx`
- `frontend/src/components/accounting/RecentEntries.jsx`
- `frontend/src/components/accounting/SummaryCards.jsx`
- `frontend/src/components/accounting/ExpensesPieChart.jsx`
- `frontend/src/components/accounting/TrendChart.jsx`
- `frontend/src/components/accounting/CategorySelect.jsx`

### State + API

- `frontend/src/stores/useAccountingStore.js` owns categories, entries, templates, summary, and WebSocket mutation handlers.
- `frontend/src/services/accountingAPI.js` maps UI requests to backend endpoints.
- `frontend/src/hooks/useWebSocket.js` routes `accounting_*` events to the accounting store.

### Formatting & Localization

- Currency and dates are formatted in German locale (`de-DE`) in `EntriesPage.jsx` and `TemplatesPage.jsx`.
- Amounts are displayed with a prefix sign based on `entryType`.

## Working With the Feature

### Adding a New Dashboard Metric or Chart

1. Extend the summary response in `backend/app/api/accounting.py`.
2. Update `entriesAPI.summary` usage in `frontend/src/services/accountingAPI.js` if params change.
3. Create a new component in `frontend/src/components/accounting/` and wire it in `frontend/src/pages/AccountingPage.jsx`.

### Adding New Entry/Template Fields

1. Update `backend/database.py` and create a new Alembic migration.
2. Extend the Pydantic schemas and CRUD logic in `backend/app/api/accounting.py`.
3. Update UI forms and edit modals in `frontend/src/components/accounting/QuickEntryForm.jsx` or the relevant page.

### Adding New Filters

1. Add filter state and inputs in `frontend/src/pages/EntriesPage.jsx`.
2. Map the new params in `frontend/src/services/accountingAPI.js`.
3. Handle the filter in `list_entries` inside `backend/app/api/accounting.py`.

### Category Tree Updates

- Use `getHierarchicalCategories` from `useAccountingStore`.
- Keep parent/child depth at two levels and ensure `type` matches `entryType`.

## Possible Future Extensions

### Feature Ideas

- **Budgets**: Set monthly spending limits per category with progress tracking
- **Goals**: Define savings targets with deadlines and track progress
- **Attachments**: Attach receipt photos to entries (AI-assisted entry creation)
- **Accounts**: Track balances across multiple bank accounts/credit cards

### Account Support (Reserved)

The `accountId` field already exists in `accounting_entries`. When implementing:

1. Add `accounting_accounts` table
2. Make `accountId` NOT NULL for new entries
3. Migrate existing entries to a default account
4. Add account selector to entry form
5. Add balance tracking and reconciliation views

### Budget Support

```sql
CREATE TABLE accounting_budgets (
    id VARCHAR PRIMARY KEY,
    "categoryId" VARCHAR NOT NULL REFERENCES accounting_categories(id),
    amount DECIMAL(12, 2) NOT NULL,
    "periodType" VARCHAR(10) NOT NULL CHECK ("periodType" IN ('monthly', 'yearly')),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Goal Support

```sql
CREATE TABLE accounting_goals (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "targetAmount" DECIMAL(12, 2) NOT NULL,
    "currentAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    deadline DATE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```
