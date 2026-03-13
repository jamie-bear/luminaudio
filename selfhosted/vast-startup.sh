#!/bin/bash
# Vast.ai startup script for LuminAudio
# Don't use set -e — we want to handle failures gracefully

echo "Starting LuminAudio on Vast.ai..."

# Start backend (model loading now happens in the background within FastAPI)
cd /app
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --log-level info &
BACKEND_PID=$!

# Wait for backend HTTP server to be ready (responds before models finish loading)
echo "Waiting for backend to start..."
for i in {1..60}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "ERROR: Backend process exited unexpectedly."
        exit 1
    fi
    echo "Waiting for backend... ($i/60)"
    sleep 2
done

# Start frontend
cd /app/frontend
PORT=3341 npm start &
FRONTEND_PID=$!

echo "LuminAudio started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Access the UI at http://<your-vast-instance>:3341"

# Wait for any process to exit
wait -n

# If one process exits, kill the other and exit
echo "A process exited. Shutting down..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
wait
exit 1
