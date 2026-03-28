FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

EXPOSE 8000

CMD ["uvicorn", "runtimes.asgi.app:app", "--host", "0.0.0.0", "--port", "8000"]
