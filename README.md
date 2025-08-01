# 📅 Schedule Maker 2.0

> A modern, collaborative university schedule management system built with FastAPI and Next.js

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 🚀 Features

### Core Functionality
- 🔐 **JWT Authentication** - Secure user registration and login
- 🏛️ **Multi-University Support** - Support for different university systems
- 📚 **Course Management** - Browse and search university courses
- 📅 **Schedule Builder** - Visual, drag-and-drop schedule creation
- ⚡ **Conflict Detection** - Automatic detection of time conflicts
- 🤝 **Real-time Collaboration** - Work on schedules with others via WebSocket
- 📱 **Responsive Design** - Mobile-first, modern UI
- 🌙 **Dark/Light Mode** - Toggle between themes
- 📊 **Schedule Comparison** - Compare multiple schedule options
- ⭐ **Favorites System** - Save and organize preferred schedules

### Technical Features
- 🔄 **Real-time Updates** - WebSocket-powered live collaboration
- 📁 **CSV Import** - Bulk import course data
- 🎨 **Modern UI Components** - Built with Radix UI and Tailwind CSS
- 🔍 **Advanced Search** - Filter courses by multiple criteria
- 📈 **Analytics Dashboard** - User activity and schedule statistics
- 🔒 **Security First** - Environment-based configuration, no hardcoded secrets

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI with async support
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt hashing
- **WebSocket**: Real-time collaboration features
- **API Documentation**: Auto-generated with OpenAPI/Swagger

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **State Management**: Zustand for global state
- **HTTP Client**: Axios with React Query for data fetching
- **Themes**: next-themes for dark/light mode

### Infrastructure
- **Deployment**: Railway (backend) + Vercel (frontend)
- **Database**: PostgreSQL (cloud-hosted)
- **Environment**: Docker support included

## 📋 Prerequisites

- **Node.js** 18+ 
- **Python** 3.8+
- **PostgreSQL** 12+
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/schedule-maker-2.git
cd schedule-maker-2
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Database Setup
```bash
# Make sure PostgreSQL is running
# Create database
createdb schedule_maker

# Run database setup
python scripts/setup_database.py

# Import sample data (optional)
python scripts/import_csv.py
```

### 4. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API URL
```

### 5. Run the Application
```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🐳 Docker Setup

### Using Docker Compose
```bash
# Set environment variables
export ADMIN_EMAIL=admin@youruniversity.edu
export ADMIN_PASSWORD=your-secure-password

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/schedule_maker

# Security
SECRET_KEY=your-super-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Admin User (for initial setup)
ADMIN_EMAIL=admin@youruniversity.edu
ADMIN_PASSWORD=your-secure-password
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
ADMIN_STUDENT_ID=ADMIN001

# WebSocket
WS_HOST=0.0.0.0
WS_PORT=8000

# Development
DEBUG=True
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout

### Core Endpoints
- `GET /api/universities` - List universities
- `GET /api/courses` - Search courses with filters
- `GET /api/schedules` - User's schedules
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule

### Collaboration Endpoints
- `POST /api/collaboration/sessions` - Create collaboration session
- `GET /api/collaboration/sessions/{id}` - Join session
- `WebSocket /ws/collaboration/{session_id}` - Real-time collaboration

### System Endpoints
- `GET /health` - Health check
- `GET /db-status` - Database status

**Full API documentation available at**: `/docs` when running the backend

## 🎨 UI Components

### Available Components
- **Buttons**: Primary, secondary, outline, ghost variants
- **Cards**: Schedule cards with flip animations
- **Dialogs**: Modal dialogs for forms and confirmations
- **Inputs**: Text inputs with validation and autocomplete
- **Selects**: Dropdown selectors with search
- **Tabs**: Tabbed interfaces for organizing content
- **Toast**: Notification system
- **Theme Toggle**: Dark/light mode switcher

### Custom Hooks
- `useWebSocket` - WebSocket connection management
- `useDebounce` - Input debouncing
- `useAutocomplete` - Autocomplete functionality
- `use-toast` - Toast notification system

## 🤝 Collaboration Features

### Real-time Collaboration
- **Session Management**: Create and join collaborative sessions
- **Live Updates**: See changes from other users instantly
- **Conflict Resolution**: Handle simultaneous edits gracefully
- **User Presence**: Show who's currently editing

### Schedule Sharing
- **Share Links**: Generate shareable links for schedules
- **Permission Levels**: View-only or edit access
- **Version History**: Track changes over time

## 📊 Database Schema

### Core Tables
- **users** - User accounts and profiles
- **universities** - University information and settings
- **courses** - Course catalog data
- **sections** - Course sections with times and instructors
- **sessions** - Individual class sessions
- **schedules** - User-created schedules
- **schedule_sessions** - Many-to-many relationship between schedules and sessions
- **collaborations** - Collaboration session data

## 🔧 Development

### Code Structure
```
schedule-maker-2/
├── backend/
│   ├── app/
│   │   ├── database/         # Database configuration
│   │   ├── models/           # SQLAlchemy models
│   │   ├── routers/          # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utilities and helpers
│   │   └── main.py           # FastAPI application
│   ├── scripts/              # Database and utility scripts
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API services
│   │   ├── stores/           # State management
│   │   └── types/            # TypeScript types
│   └── package.json          # Node.js dependencies
└── docker-compose.yml        # Docker configuration
```

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality
```bash
# Backend linting
cd backend
flake8 app/
black app/

# Frontend linting
cd frontend
npm run lint
npm run type-check
```

## 🚀 Deployment

### Production Deployment
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions including:
- Railway/Render backend deployment
- Vercel frontend deployment
- Database setup and migration
- Environment configuration
- Security considerations

### Environment-Specific Configs
- **Development**: Local PostgreSQL, debug mode enabled
- **Staging**: Cloud database, reduced logging
- **Production**: Full security, performance optimizations

## 🔒 Security

### Security Features
- **Password Hashing**: bcrypt with salt
- **JWT Tokens**: Secure token-based authentication
- **CORS Protection**: Configurable origin restrictions
- **SQL Injection Prevention**: SQLAlchemy ORM protections
- **Environment Variables**: No hardcoded secrets
- **Input Validation**: Pydantic schemas for all inputs

### Security Best Practices
- All sensitive data stored in environment variables
- Database credentials never committed to repository
- HTTPS enforced in production
- Regular dependency updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues
- **CORS Errors**: Check CORS_ORIGINS environment variable
- **Database Connection**: Verify DATABASE_URL format
- **WebSocket Issues**: Ensure WebSocket URL uses correct protocol (ws/wss)
- **Build Failures**: Check Node.js and Python versions

### Getting Help
1. Check the [Issues](https://github.com/yourusername/schedule-maker-2/issues) page
2. Review the [Deployment Guide](./DEPLOYMENT_GUIDE.md)
3. Check application logs for error details

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)

---

**Made with ❤️ for university students everywhere**