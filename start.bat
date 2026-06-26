@echo off
echo ========================================
echo  AI Payment Reminder Assistant
echo ========================================
echo.

REM Check if .env exists in backend
if not exist "backend\.env" (
    echo Creating .env from template...
    copy "backend\.env.example" "backend\.env"
    echo.
    echo [!] IMPORTANT: Open backend\.env and add your ANTHROPIC_API_KEY
    echo     Get your key at: https://console.anthropic.com
    echo.
    pause
)

echo [1/2] Starting Backend (FastAPI)...
start "AI Payment Backend" cmd /k "cd backend && pip install -r requirements.txt -q && python main.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend (React)...
start "AI Payment Frontend" cmd /k "cd frontend && npm install && npm start"

echo.
echo ========================================
echo  App starting at http://localhost:3000
echo  Login: admin / admin123
echo  API Docs: http://localhost:8000/docs
echo ========================================
