# Campus Network Security Monitoring System

A comprehensive full-stack web application for real-time network security monitoring, built for final year project demonstration.

## Features

- 🔐 **Authentication System** - JWT-based authentication with role-based access control
- 📊 **Real-time Dashboard** - Live metrics, traffic visualization, and alert monitoring
- 🌐 **Network Traffic Analysis** - Protocol distribution, connection tracking, and traffic filtering
- 🚨 **Security Alerts** - Comprehensive alert management with severity levels and status tracking
- 🛡️ **Threat Intelligence** - IOC tracking, reputation scoring, and threat mapping
- ⚙️ **System Settings** - Configuration management and user preferences
- 👥 **User Management** - Admin panel for user administration
- 🌍 **Multilingual Support** - English, Russian, Kyrgyz, Tajik, Kazakh
- 🎨 **Modern UI** - Dark theme with glassmorphism effects and smooth animations

## Technology Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI)
- Tailwind CSS
- Chart.js for data visualization
- React Router v6
- Axios for API calls
- Socket.IO client for real-time updates
- react-i18next for internationalization

### Backend
- Django 4.x with Django REST Framework
- SQLite database (default for development, PostgreSQL supported)
- Django Channels for WebSocket support
- Redis for caching
- JWT authentication
- CORS configuration

## Project Structure

```
fyp/
├── backend/          # Django backend
│   ├── apps/        # Django applications
│   ├── config/      # Django settings
│   └── manage.py
├── frontend/        # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── contexts/
│   └── package.json
└── README.md
```

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up environment variables (optional, create `.env` file if needed):
```
SECRET_KEY=your-secret-key-here
DEBUG=True
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**Note:** SQLite is used by default - no database setup required! The database file (`db.sqlite3`) will be created automatically.

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create superuser:
```bash
python manage.py createsuperuser
```

6. Generate mock data (optional but recommended):
```bash
python manage.py generate_mock_data
```

7. Start Redis server (required for WebSocket):
```bash
redis-server
```

8. Run Django server:
```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
REACT_APP_API_URL=http://localhost:8000/api
```

4. Start development server:
```bash
npm start
```

## Default Credentials

After creating a superuser, you can log in with those credentials. For development, you can also register a new account.

## API Endpoints

- `/api/auth/login/` - User login
- `/api/auth/register/` - User registration
- `/api/dashboard/stats/` - Dashboard statistics
- `/api/network/traffic/` - Network traffic data
- `/api/alerts/` - Security alerts
- `/api/threats/` - Threat intelligence
- `/api/system/health/` - System health status

## WebSocket Endpoints

- `ws://localhost:8000/ws/dashboard/` - Dashboard updates
- `ws://localhost:8000/ws/alerts/` - Alert notifications
- `ws://localhost:8000/ws/network/` - Network traffic updates

## Development Notes

- The system uses mock data for demonstration purposes
- Real-time updates require Redis to be running
- WebSocket connections are established automatically when authenticated
- All API requests require JWT authentication (except login/register)

## License

This project is created for educational purposes as a final year project.

