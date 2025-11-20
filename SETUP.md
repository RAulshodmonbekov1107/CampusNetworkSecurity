# Setup Guide - Campus Network Security Monitoring System

This guide will help you set up the complete system for development and demonstration.

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ and npm installed
- Redis server (for WebSocket support)
- **Note:** SQLite is used by default - no database server setup required!

## Step-by-Step Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Create .env file (optional - SQLite works without it)
# Only needed if you want to customize settings
# touch .env
# Add to .env if needed:
# SECRET_KEY=your-secret-key-here
# DEBUG=True
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379

# Note: SQLite database will be created automatically (db.sqlite3)
# To use PostgreSQL instead, add USE_POSTGRES=True to .env and configure DB credentials

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (follow prompts)
python manage.py createsuperuser

# Generate mock data for development
python manage.py generate_mock_data --traffic 1000 --alerts 50 --threats 30

# Start Redis server (in a separate terminal)
redis-server

# Start Django development server
python manage.py runserver
```

The backend API will be available at: `http://localhost:8000`
Admin panel: `http://localhost:8000/admin`

### 2. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env

# Start development server
npm start
```

The frontend will be available at: `http://localhost:3000`

## Default Login

After creating a superuser, you can log in with those credentials. Alternatively, you can register a new account from the registration page.

## Testing the System

1. **Login/Register**: Go to `http://localhost:3000/login` and log in or register
2. **Dashboard**: View real-time metrics and charts
3. **Network Traffic**: Browse network traffic data with filters
4. **Security Alerts**: View and manage security alerts
5. **Threat Intelligence**: Search and view threat intelligence data
6. **Settings**: Configure system settings and user preferences
7. **User Management**: (Admin only) Manage users

## Troubleshooting

### Database Connection Issues
- SQLite is used by default - no setup needed!
- The database file `db.sqlite3` will be created automatically in the backend directory
- If using PostgreSQL, ensure it's running and check credentials in `.env` file
- Verify PostgreSQL database exists: `psql -l | grep campus_security`

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping` (should return PONG)
- Check Redis host/port in `.env` file

### Frontend API Connection Issues
- Verify backend is running on port 8000
- Check `REACT_APP_API_URL` in frontend `.env` file
- Check CORS settings in Django settings.py

### Port Already in Use
- Backend: Change port with `python manage.py runserver 8001`
- Frontend: Change port by setting `PORT=3001` in `.env` or use `npm start -- --port 3001`

## Generating More Mock Data

To generate additional mock data:

```bash
# Generate more network traffic
python manage.py generate_mock_data --traffic 5000

# Generate more alerts
python manage.py generate_mock_data --alerts 200

# Generate more threats
python manage.py generate_mock_data --threats 100

# Generate all at once
python manage.py generate_mock_data --traffic 5000 --alerts 200 --threats 100
```

## Production Deployment Notes

For production deployment:

1. Set `DEBUG=False` in `.env`
2. Set a strong `SECRET_KEY`
3. Configure proper `ALLOWED_HOSTS`
4. Set up proper database (not SQLite)
5. Configure static files serving
6. Set up SSL/HTTPS
7. Configure proper CORS origins
8. Use environment variables for sensitive data
9. Set up proper logging
10. Configure backup strategy

## Additional Resources

- Django Documentation: https://docs.djangoproject.com/
- React Documentation: https://react.dev/
- Material-UI Documentation: https://mui.com/
- Chart.js Documentation: https://www.chartjs.org/

