# Campus Network Security Monitoring System - Backend

## Setup Instructions

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory (optional, defaults will work):
```
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**Note:** The project uses SQLite by default for development. No database setup required!
To use PostgreSQL instead, set `USE_POSTGRES=True` in `.env` and configure database credentials.

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. Create a superuser:
```bash
python manage.py createsuperuser
```

7. Start Redis (required for WebSocket and caching):
```bash
redis-server
```

8. Run the development server:
```bash
python manage.py runserver
```

The API will be available at http://localhost:8000

## Generate Mock Data

To populate the database with mock data for development, you can create a management command or use Django shell.

