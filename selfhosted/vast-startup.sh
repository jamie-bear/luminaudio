#!/bin/bash
set -e

echo "Starting LuminAudio on Vast.ai..."

# Start backend
cd /app
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --log-level info &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    echo "Waiting for backend... ($i/30)"
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

# Exit with status of process that exited first
exit $?
