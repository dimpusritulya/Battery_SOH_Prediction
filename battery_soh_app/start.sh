#!/bin/bash
# ─────────────────────────────────────────────────
# Battery SOH Predictor — Quick Start Script
# ─────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV="$PROJECT_ROOT/.venv"

echo "🔋 Battery SOH Predictor — Starting..."
echo ""

# Start Flask backend
echo "⚡ Starting Flask backend on http://localhost:5001 ..."
"$VENV/bin/python" "$SCRIPT_DIR/backend/app.py" &
FLASK_PID=$!
echo "   Flask PID: $FLASK_PID"
sleep 2

# Start React frontend
echo ""
echo "🌐 Starting React frontend on http://localhost:5173 ..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
REACT_PID=$!

echo ""
echo "──────────────────────────────────────────────"
echo "  ✅ App is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5001/api/health"
echo "──────────────────────────────────────────────"
echo "  Press Ctrl+C to stop both servers"
echo ""

# Handle Ctrl+C
trap "echo ''; echo 'Shutting down...'; kill $FLASK_PID $REACT_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
