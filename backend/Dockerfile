FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Runs database migrations and reference catalog seeding before launching the server
CMD sh -c "alembic upgrade head && python seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"
