# Schedule Maker 2.0 - Backend

FastAPI backend for university schedule management system.

## Setup Instructions

### Prerequisites
- Python 3.12+
- PostgreSQL database
- Redis (optional, for caching)

### Installation

1. **Install python3-venv (if not installed):**
   ```bash
   sudo apt install python3-venv python3-full
   ```

2. **Create and activate virtual environment:**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Configure database:**
   - Create PostgreSQL database named `schedule_maker`
   - Update `DATABASE_URL` in `.env` file

4. **Initialize sample data (optional):**
   ```bash
   python init_data.py
   ```

### Running the Application

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the main.py
python app/main.py
```

### API Documentation

Once running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

## Project Structure

```
app/
├── database/           # Database connection and config
├── models/            # SQLAlchemy ORM models
├── routers/           # FastAPI route handlers
├── utils/             # Utilities (security, dependencies)
├── schemas.py         # Pydantic models for request/response
└── main.py           # FastAPI application entry point
```

## Key Features

- **Authentication:** JWT-based auth with user registration/login
- **Universities:** CRUD operations for universities
- **Courses:** Advanced course search with filters  
- **Schedules:** Personal schedule management
- **Sessions:** Course session management
- **CORS:** Configured for frontend integration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Universities  
- `GET /api/universities` - List all universities
- `GET /api/universities/{id}` - Get specific university

### Courses
- `GET /api/courses/search` - Search courses with filters
- `GET /api/courses/{id}` - Get course with sections
- `GET /api/courses/university/{id}` - Get courses by university

### Schedules
- `GET /api/schedules/my` - Get user's schedules
- `POST /api/schedules` - Create new schedule
- `POST /api/schedules/{id}/sessions` - Add session to schedule

### System
- `GET /health` - Health check
- `GET /db-status` - Database status

## Database Models

- **University** - Educational institutions
- **User** - System users with roles
- **Course** - Academic courses  
- **Section** - Course sections
- **Session** - Class sessions (time/location)
- **Schedule** - User's saved schedules
- **ScheduleSession** - Many-to-many relationship

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/schedule_maker
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000
```

## Development

The backend is fully functional and ready for frontend integration. All core features are implemented according to the project specifications.