## FamTown

FamTown is a family home dashboard. It helps households organize shared calendars, files, notes, photos, finances, and has a collaborative townsquare that can be decorated

> **Note**: For now, registration is disabled; users must be added added manually.

## Quick Start

### Development (recommended)
```bash
make init
make setup-dev
make run-dev
```

If you are not using `make`, run:
```bash
docker network inspect "${DOCKER_NETWORK_NAME:-breathnet}" >/dev/null 2>&1 || \
  docker network create "${DOCKER_NETWORK_NAME:-breathnet}"
docker compose -p famtown --profile dev build
docker compose -p famtown --profile dev up
```

Available at: Frontend `http://localhost:3000`, Backend API `http://localhost:8000`, API Docs `http://localhost:8000/docs`.

### Production (Docker only)
```bash
make init
make setup
make run
```

If you are not using `make`, run:
```bash
docker network inspect "${DOCKER_NETWORK_NAME:-breathnet}" >/dev/null 2>&1 || \
  docker network create "${DOCKER_NETWORK_NAME:-breathnet}"
docker compose -p famtown --profile prod build
docker compose -p famtown --profile prod up -d
```

Production ports (from `docker-compose.yml`): Frontend `http://localhost:8069`, Backend API `http://localhost:8001`.

### Create Users
```bash
python scripts/create_user.py susan susan@example.com password123 Susan
python scripts/create_user.py sam sam@example.com password456 Sam
```

### Login
Open `http://localhost:3000` and log in with the credentials above. In production, use `http://localhost:8069`.

## Environment Variables

Set variables in your shell before running `make` or `docker compose`. The Docker Compose file maps
`FAMTOWN_*` variables into the backend and frontend containers.

Required for local/dev:
- `FAMTOWN_DATABASE_URL` - PostgreSQL connection string used by backend
- `FAMTOWN_JWT_SECRET_KEY` - Min 32 chars (required in production)

Optional:
- `GEMINI_API_KEY` - Enables AI image generation widget
- `FAMTOWN_FRONTEND_URL` - CORS origin (defaults to `http://localhost:3000`)
- `FAMTOWN_API_URL` - Frontend API base (defaults to dev backend)
- `FAMTOWN_WS_URL` - Frontend WebSocket base (defaults to dev backend)
- `FAMTOWN_UI_THEME`, `FAMTOWN_APP_NAME`, `FAMTOWN_APP_SHORT_NAME`, `FAMTOWN_APP_DESCRIPTION`, `FAMTOWN_AUTH_TOKEN_KEY`
- `DOCKER_NETWORK_NAME` - External network name (default `breathnet`)

AI image generation is disabled when `GEMINI_API_KEY` is not set.

### Concept
- **Townsquare (landing page)**: A fullscreen blackboard where we pin objects (events, pictures, files, texts). Every logged-in user sees the same townsquare and can modify it. We assume only one user edits at a time; live concurrent editing is not required initially.
- **Navigation**: Each object type has a dedicated view connected to the townsquare in four directions.
  - Left: Calendar (events)
  - Right: Photos (pictures)
  - Down: Desk (files)
  - Up: Sky (texts)
  - Desktop: Navigate via subtle arrows on edges; Mobile: double-tap on corners.
- **Object Relationships**: Some objects (e.g., texts, pictures, events) can relate to each other, enabling aggregation and filtering in their views.
- **Access Model**: All objects are visible to all users; no ACLs/roles/permissions for now — an anarchistic space.

### Tech Stack
- **Backend**: FastAPI with async SQLAlchemy, PostgreSQL, JWT auth, WebSocket
- **Frontend**: React 18, Tailwind CSS, React Router, Zustand, Axios, WebSocket client


## Architecture

The system consists of a FastAPI backend and a React frontend. The backend serves REST APIs, handles file uploads, issues JWTs for authentication, and manages a WebSocket for real-time updates. The frontend renders the townsquare and related views, manages global state with Zustand, and keeps the UI in sync via WebSocket events.

### Diagram
```
┌─────────────────────────────────────────────────────────┐
│                       Frontend                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Calendar │  │Townsquare│  │  Photos  │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                     │
│  ┌────┴─────────────┴─────────────┴─────┐             │
│  │           Navigation                   │             │
│  └────┬───────────────────────────────┬──┘             │
│       │                               │                 │
│  ┌────┴────┐                    ┌─────┴─────┐         │
│  │  Zustand│                    │ WebSocket │         │
│  │  Stores │                    │  Client   │         │
│  └────┬────┘                    └─────┬─────┘         │
│       │                               │                 │
│  ┌────┴───────────────────────────────┴─────┐         │
│  │        API Services (Axios)               │         │
│  └───────────────────┬───────────────────────┘         │
└────────────────────────┼───────────────────────────────┘
                        │
                        │ HTTP / WebSocket
                        │
┌────────────────────────┼───────────────────────────────┐
│                        │         Backend                │
│  ┌─────────────────────┴─────────────────────┐         │
│  │          FastAPI App                       │         │
│  └─────┬───────────────────────────┬──────────┘         │
│        │                           │                     │
│  ┌─────┴─────┐              ┌─────┴──────┐             │
│  │   API     │              │ WebSocket  │             │
│  │  Routers  │              │  Manager   │             │
│  └─────┬─────┘              └─────┬──────┘             │
│        │                           │                     │
│  ┌─────┴───────────────────────────┴──────┐            │
│  │           Services Layer                │            │
│  │  (Auth, File, WebSocket)               │            │
│  └─────────────────┬────────────────────────┘            │
│                    │                                      │
│  ┌─────────────────┴────────────────────────┐            │
│  │        Database (PostgreSQL)             │            │
│  │  Users, Events, Pictures, Files, Texts   │            │
│  │         TownsquareItems                  │            │
│  └──────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

### File Structure
```
famtown/
├── backend/
│   ├── app/
│   │   ├── api/          # API routers
│   │   └── services/     # Business logic
│   ├── config.py         # Configuration
│   ├── database.py       # Database models
│   ├── main.py           # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   ├── stores/       # Zustand stores
│   │   ├── hooks/        # Custom hooks
│   │   └── contexts/     # React contexts
│   └── package.json
├── scripts/
│   └── create_user.py    # CLI tools
├── docker-compose.yml
├── README.md
├── SETUP.md
└── IMPLEMENTATION.md
```


## Implementation Summary

### Backend (FastAPI)
- **Database Models**: User, Event, Picture, File, Text, TownsquareItem (with x, y, width, height, zIndex, rotation)
- **API Routers**: `auth.py`, `events.py`, `pictures.py`, `files.py`, `texts.py`, `townsquare.py`, `websocket.py`
- **Services**: `auth_service.py` (JWT, password hashing), `file_service.py` (uploads, storage), `websocket_service.py` (connections, broadcast)
- **Features**: JWT auth, static file serving, WebSocket broadcasting, automatic table creation

### Frontend (React)
- **Pages**: Home, Townsquare, Calendar, Photos, Desk, Sky, Profile
- **Components**: EventCard, PictureCard, FileCard, TextCard, TownsquareObject, TownsquareCanvas, ObjectPicker, Navigation, Profile components
- **Services**: `api.js` (Axios with auth), `objectsAPI.js`, `townsquareAPI.js`, `websocket.js`
- **State (Zustand)**: `useObjectsStore.js`, `useTownsquareStore.js`, `useProfileStore.js`, `useViewConfigStore.js`
- **Hooks**: `useWebSocket.js`
- **Features**: Real-time sync, drag-and-drop, resize, z-index control, selection, navigation, uploads with progress/preview

### CLI Tools
- `scripts/create_user.py`: Create users from the command line

### Configuration
- Docker Compose setup
- Environment variables for backend and frontend
- CORS configured for local development
- Upload directory auto-creation


### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for CLI scripts)
- Node.js 18+ and npm (for local frontend development)


## Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Database Migrations
Tables are auto-created on startup. For custom migrations, use `backend/migrations/`.


## API Reference

### Authentication
- `POST /api/auth/login` — Login
- `GET /api/auth/profile` — Get current user
- `POST /api/auth/logout` — Logout

### Events
- `GET /api/events` — List all events
- `POST /api/events` — Create event
- `PUT /api/events/{id}` — Update event
- `DELETE /api/events/{id}` — Delete event

### Pictures
- `GET /api/pictures` — List all pictures
- `POST /api/pictures` — Upload picture
- `PUT /api/pictures/{id}` — Update caption
- `DELETE /api/pictures/{id}` — Delete picture

### Files
- `GET /api/files` — List all files
- `POST /api/files` — Upload file
- `GET /api/files/{id}/download` — Download file
- `DELETE /api/files/{id}` — Delete file

### Texts
- `GET /api/texts` — List all texts
- `POST /api/texts` — Create text
- `PUT /api/texts/{id}` — Update text
- `DELETE /api/texts/{id}` — Delete text

### Townsquare
- `GET /api/townsquare` — Get all items
- `POST /api/townsquare` — Add item to townsquare
- `PUT /api/townsquare/{id}` — Update item position/size
- `DELETE /api/townsquare/{id}` — Remove item

### WebSocket
- `WS /ws` — Real-time updates connection


## Real-time Updates

WebSocket events include:
- `object_created` — New object added
- `object_updated` — Object modified
- `object_deleted` — Object removed
- `townsquare_updated` — Canvas item changed


## Troubleshooting
- **Database connection errors**: Ensure PostgreSQL is running and `DATABASE_URL` is correct.
- **WebSocket not connecting**: Confirm `VITE_WS_URL` matches backend URL.
- **File uploads failing**: Ensure the uploads directory exists and has proper permissions.


## Production Deployment
1. Set `DEBUG=false` via environment variables
2. Generate a secure JWT secret: `python -c 'import secrets; print(secrets.token_urlsafe(32))'`
3. Configure proper CORS origins
4. Use a production-ready database
5. Configure file storage (local or cloud)

SSL/TLS is assumed to be terminated by host nginx. If you want to implement ssl inside the stack (e.g. by added a certbot docker container), feel free to fork and/or file a PR.


## Known Limitations
1. Canvas fixed size may not work on very small screens
2. Native drag/resize can be improved with a library
3. WebSocket lacks reconnection with state recovery
4. No file size limits configured
5. No user permissions or ACLs
6. Basic validation only


## Future Enhancements
- Object relationships across views
- User registration page
- Object editing modals
- Search functionality
- Undo/redo for townsquare
- Image thumbnails
- PDF preview
- Map view
- Mobile-optimized townsquare
- Collaborative editing indicators
- Object versioning
- Export/import functionality


## Security and Configuration Notes
- Never commit environment files or API keys.
- Document secret usage and configuration in deployment notes.
- Keep CORS origins and JWT secrets configured appropriately for each environment.


