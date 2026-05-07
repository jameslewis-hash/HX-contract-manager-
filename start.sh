#!/bin/bash
set -e

echo "HX Contract Manager — startup"
echo ""

# Install deps if needed
if [ ! -d "backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

# Copy .env if not present
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from .env.example — edit it to configure SMTP."
fi

echo ""
echo "Starting backend on http://localhost:3001"
echo "Starting frontend on http://localhost:5173"
echo ""

# Run both in parallel
cd backend && npm start &
BACKEND_PID=$!

cd frontend && npm run dev &
FRONTEND_PID=$!

# Kill both on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT TERM

wait
