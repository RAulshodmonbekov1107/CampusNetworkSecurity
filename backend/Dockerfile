FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpcap-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]


