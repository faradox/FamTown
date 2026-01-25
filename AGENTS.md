# FamTown - Family Dashboard Application

## Overview
A real-time collaborative family dashboard with event calendar, photo sharing, file storage, and a virtual "townsquare" canvas. Built with FastAPI (Python) backend and React frontend, orchestrated via Docker Compose.

## Project Structure

```
famtown/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/              # Router modules (auth, events, pictures, files, texts, townsquare, profile, websocket, genai, view_configs, accounting)
│   │   └── services/         # Business logic (auth, file, websocket, genai, accounting)
│   ├── database.py           # SQLAlchemy models & async DB manager
│   ├── config.py             # Environment config with validation
│   ├── main.py               # FastAPI entry point
│   ├── alembic/              # Database migrations
│   └── uploads/              # User uploads (git-ignored)
├── frontend/                 # React 19 + Tailwind CSS
│   ├── src/
│   │   ├── components/       # UI components organized by feature (auth/, common/, accounting/, objects/, townsquare/, profile/, widgets/)
│   │   ├── pages/            # Route pages (HomePage, TownsquarePage, CalendarPage, AccountingPage, EntriesPage, CategoriesPage, TemplatesPage, etc.)
│   │   ├── services/         # Axios API clients (including accountingAPI)
│   │   ├── stores/           # Zustand state management (including useAccountingStore)
│   │   ├── hooks/            # Custom hooks (useWebSocket)
│   │   └── contexts/         # React contexts (AuthContext)
│   └── tailwind.config.js    # Tailwind configuration
├── scripts/                  # Utility scripts
├── Makefile                  # Docker & deployment automation
├── docker-compose.yml        # Multi-service orchestration
```

## Tech Stack

### Backend
- **Framework:** FastAPI 0.115.6 with async SQLAlchemy 2.0.23
- **Database:** PostgreSQL (asyncpg driver)
- **Auth:** JWT (PyJWT) + bcrypt password hashing
- **Real-time:** WebSocket with broadcast manager
- **AI:** Google Gemini API integration
- **Migrations:** Alembic

### Frontend
- **Framework:** React 19.2.0 (Create React App)
- **Styling:** Tailwind CSS 3.3.0 + forms/typography plugins
- **State:** Zustand 5.0.5 (4 stores: objects, townsquare, profile, viewConfig)
- **Data Fetching:** TanStack React Query 5.90.5
- **Canvas:** react-konva (Konva.js) for 2D townsquare
- **Icons:** lucide-react
- **Forms:** react-hook-form

### DevOps
- **Containers:** Docker Compose with `dev` and `prod` profiles
- **Network:** External `breathnet` Docker network (shared with other services)
- **Proxy:** nginx with WebSocket support

## Development Commands

All commands use `make`. Run `make help` to see available targets.

```bash
# Setup
make init              # Create .env from template
make setup-dev         # Build development containers
make setup             # Build production containers

# Development
make run-dev           # Start dev servers (frontend:3000, backend:8000) with hot reload
make logs              # View all container logs
make logs-backend      # Backend logs only
make shell-backend     # Shell into backend container

# Production
make build             # Build production images
make run               # Start production services
make deploy            # Full production deployment
make update            # Pull and rebuild

# Database
make db-migrate        # Run Alembic migrations
make db-reset          # Reset database (destructive)

# Cleanup
make stop              # Stop all containers
make clean             # Remove containers and volumes
```

## Coding Conventions

### Python (Backend)
- Black formatter with 88-character line limit
- Async SQLAlchemy patterns throughout - use `async with db_manager.get_session() as session:`
- snake_case for modules, functions, and variables
- UUID strings for all entity IDs
- Pydantic models for all request/response schemas
- `Depends(get_current_user)` for authenticated routes
- WebSocket broadcast after mutations: `await ws_manager.send_object_created(...)`

### React (Frontend)
- Prettier + Tailwind plugin with 2-space indentation
- PascalCase for components (`EventCard.jsx`)
- camelCase for hooks and stores (`useObjectsStore`)
- Zustand stores with immutable updates (spread operators)
- Dark mode support via `dark:` Tailwind prefix
- lucide-react for all icons

### General Rules
- Try to keep files under 500 LOC - modularize aggressively
- **No emojis** in logging, comments, or code (only acceptable in UI elements)
- Colocate feature-specific assets with their module
- Environment variables: lowercase with underscores

## Key Patterns

### API Route Pattern
```python
@router.post("", response_model=ResponseModel)
async def create_item(
    data: CreateSchema,
    current_user: User = Depends(get_current_user)
):
    async with db_manager.get_session() as session:
        item = Model(id=str(uuid.uuid4()), ...)
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await ws_manager.send_object_created("type", response.dict())
        return response
```

### Zustand Store Pattern
```javascript
export const useStore = create((set, get) => ({
  items: [],
  isLoading: false,
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({
    items: [...state.items, item],
  })),
}));
```

### Component Pattern
```jsx
const Card = ({ item, onClick, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${className}`}>
    {/* content */}
  </div>
);
```

## Database Models

12 SQLAlchemy models in `backend/database.py`:
- `User` - accounts with avatar, interests, preferences
- `PasswordResetToken` - password recovery
- `Event` - calendar events with location (JSON)
- `Picture` - uploaded images with metadata
- `File` - general file uploads
- `Text` - notes/wishes by type
- `TownsquareItem` - canvas positioning with itemMetadata (JSONB)
- `ProfileItem` - per-user profile canvas items
- `ViewConfig` - per-user view settings (JSONB)
- `AccountingCategory` - shared accounting categories (2-level hierarchy)
- `AccountingTemplate` - shared quick-entry templates (userId stored for audit)
- `AccountingEntry` - shared income/expense entries (userId stored for audit)

## Accounting Feature Notes

- Backend API lives in `backend/app/api/accounting.py` and is mounted in `backend/main.py`.
- Default accounting categories seed on startup via `backend/app/services/accounting_service.py`.
- Accounting DB migration: `backend/alembic/versions/a1b2c3d4e5f6_add_accounting_tables.py`.
- WebSocket broadcasts use `accounting_category`, `accounting_entry`, `accounting_template` object types.
- Frontend routes/pages: `frontend/src/pages/AccountingPage.jsx`, `frontend/src/pages/EntriesPage.jsx`, `frontend/src/pages/CategoriesPage.jsx`, `frontend/src/pages/TemplatesPage.jsx`.
- Frontend state and API client: `frontend/src/stores/useAccountingStore.js`, `frontend/src/services/accountingAPI.js`.

## Environment Variables

Set via environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - Min 32 chars, required in production
- `FRONTEND_URL` - For CORS (production)
- `DEBUG` - true/false
- `LOG_LEVEL` - DEBUG/INFO/WARNING
- `GEMINI_API_KEY` - Optional, enables AI features

## Security Notes

- Never commit `.env` files or API keys
- JWT tokens expire in 24 hours
- File uploads validated by content-type and size (5MB max for avatars)
- Files stored by UUID to prevent path traversal
- CORS configured for specific origins only

## Restrictions

- **Git is READ-ONLY** - never commit or push
- **No testing** - only write code
- **No direct server commands** - write scripts or provide commands as code blocks
