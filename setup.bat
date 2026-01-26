@echo off
echo ================================
echo LifeLink - Setup Script
echo ================================
echo.

echo [1/5] Installing Backend Dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Error installing backend dependencies!
    pause
    exit /b 1
)
echo ✓ Backend dependencies installed
echo.

echo [2/5] Installing ML Dependencies...
cd ..\ml
pip install -r requirements.txt
if errorlevel 1 (
    echo Error installing ML dependencies!
    pause
    exit /b 1
)
echo ✓ ML dependencies installed
echo.

echo [3/5] Training Enhanced ML Model...
python train_model_enhanced.py
if errorlevel 1 (
    echo Warning: ML model training failed. You can train it later.
)
echo ✓ ML model training completed
echo.

echo [4/5] Checking MongoDB...
where mongod >nul 2>&1
if errorlevel 1 (
    echo Warning: MongoDB not found in PATH. Please install MongoDB.
) else (
    echo ✓ MongoDB found
)
echo.

echo [5/5] Setup Complete!
echo.
echo ================================
echo Next Steps:
echo ================================
echo 1. Update backend/.env with your configuration
echo 2. Start MongoDB: mongod
echo 3. Start ML API: cd ml ^&^& python app.py
echo 4. Start Backend: cd backend ^&^& npm run dev
echo 5. Open frontend in browser
echo.
echo For detailed instructions, see IMPLEMENTATION.md
echo ================================
pause
