#!/bin/bash
# Vast.ai startup script for LuminAudio
# Don't use set -e — we want to handle failures gracefully

echo "Starting LuminAudio on Vast.ai..."

# ---------------------------------------------------------------------------
# Download model weights on first boot (skipped if already cached)
# Model cache persists across restarts if /app/model-cache is on a host volume.
# Set HF_TOKEN env var on the Vast.ai instance to enable turbo model download.
# ---------------------------------------------------------------------------
cd /app
python - <<'PYEOF'
import os
from pathlib import Path

# Use the same cache directory that from_pretrained() uses (HF_HOME/hub).
# This is critical — snapshot_download and from_pretrained must agree on the path.
hf_home = Path(os.environ.get("HF_HOME", "/app/model-cache"))
marker_dir = hf_home  # markers go in HF_HOME root
hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")

try:
    from huggingface_hub import snapshot_download

    # Original model (public)
    orig_marker = marker_dir / ".chatterbox-original-downloaded"
    if not orig_marker.exists():
        print("Downloading Chatterbox TTS (original) weights — this is a one-time download...")
        snapshot_download("ResembleAI/chatterbox")
        orig_marker.touch()
        print("Original model downloaded.")
    else:
        print("Original model already cached, skipping download.")

    # Turbo model (may be gated — attempt download with or without token)
    turbo_marker = marker_dir / ".chatterbox-turbo-downloaded"
    if not turbo_marker.exists():
        print("Downloading Chatterbox TTS (turbo) weights — this is a one-time download...")
        try:
            snapshot_download("ResembleAI/chatterbox-turbo", token=hf_token if hf_token else None)
            turbo_marker.touch()
            print("Turbo model downloaded.")
        except Exception as turbo_err:
            if not hf_token:
                print(f"Turbo download failed (no HF_TOKEN set, may be needed for gated access): {turbo_err}")
            else:
                print(f"Turbo download failed: {turbo_err}")
            print("Turbo will be unavailable. The original model will still work.")
    else:
        print("Turbo model already cached, skipping download.")

except Exception as e:
    print(f"Warning: model pre-download failed: {e}")
    print("Models will be downloaded on first use instead.")
PYEOF

# Force offline mode so from_pretrained() uses cached weights without
# contacting the HF API (which would require a token for gated repos).
export HF_HUB_OFFLINE=1

# Start backend (model loading happens in the background within FastAPI)
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

# Start frontend — bind to 0.0.0.0 so it's reachable outside the container
cd /app/frontend
echo "Starting frontend on port 3341..."
PORT=3341 HOSTNAME=0.0.0.0 npm start &
FRONTEND_PID=$!

echo "LuminAudio started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# ---------------------------------------------------------------------------
# Cloudflare Tunnel (optional)
# Set CF_TUNNEL_TOKEN on the Vast.ai instance to expose the UI at your domain.
# One-time setup (run locally):
#   cloudflared tunnel login
#   cloudflared tunnel create luminaudio
#   cloudflared tunnel route dns luminaudio tts.jamiebear.net
#   cloudflared tunnel token luminaudio   ← copy this value
# Then set CF_TUNNEL_TOKEN=<that value> in the Vast.ai instance env vars.
# ---------------------------------------------------------------------------
TUNNEL_SUPERVISOR_PID=""
if [ -n "$CF_TUNNEL_TOKEN" ]; then
    echo "Starting Cloudflare Tunnel (with auto-restart on failure)..."
    # Run cloudflared in a supervisor loop so transient failures don't bring
    # down the whole container via the `wait -n` below.
    (
        while true; do
            cloudflared tunnel --no-autoupdate run --token "$CF_TUNNEL_TOKEN"
            EXIT_CODE=$?
            echo "Cloudflare Tunnel exited (code $EXIT_CODE). Restarting in 10 seconds..."
            sleep 10
        done
    ) &
    TUNNEL_SUPERVISOR_PID=$!
    echo "Cloudflare Tunnel supervisor PID: $TUNNEL_SUPERVISOR_PID"
    echo "UI available at your configured tunnel domain once the tunnel connects."
else
    echo "CF_TUNNEL_TOKEN not set — Cloudflare Tunnel disabled."
    echo "Access the UI at http://<your-vast-instance>:3341"
fi

# Wait for the backend or frontend to exit (don't let a tunnel blip tear down
# the whole container — the supervisor loop above handles tunnel restarts).
wait -n $BACKEND_PID $FRONTEND_PID

# If backend or frontend exits, kill everything and exit
echo "A core process exited. Shutting down..."
kill $BACKEND_PID $FRONTEND_PID $TUNNEL_SUPERVISOR_PID 2>/dev/null
wait
exit 1
