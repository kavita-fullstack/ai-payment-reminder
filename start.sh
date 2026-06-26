#!/bin/bash
echo "========================================"
echo " AI Payment Reminder Assistant"
echo "========================================"

# Create .env if not exists
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo ""
    echo "[!] Created backend/.env — add your ANTHROPIC_API_KEY to enable AI emails"
    echo "    Get your key at: https://console.anthropic.com"
    echo ""
fi

# Start backend
echo "[1/2] Starting Backend..."
cd backend
pip install -r requirements.txt -q
python main.py &
BACKEND_PID=$!
cd ..

sleep 4

# Start frontend
echo "[2/2] Starting Frontend..."
cd frontend
npm install --silent
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo " Frontend: http://localhost:3000"
echo " API Docs: http://localhost:8000/docs"
echo " Login: admin / admin123"
echo "========================================"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
