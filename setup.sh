#!/bin/bash

echo "================================"
echo "LifeLink - Setup Script"
echo "================================"
echo ""

echo "[1/5] Installing Backend Dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "Error installing backend dependencies!"
    exit 1
fi
echo "✓ Backend dependencies installed"
echo ""

echo "[2/5] Installing ML Dependencies..."
cd ../ml
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error installing ML dependencies!"
    exit 1
fi
echo "✓ ML dependencies installed"
echo ""

echo "[3/5] Training Enhanced ML Model..."
python train_model_enhanced.py
if [ $? -ne 0 ]; then
    echo "Warning: ML model training failed. You can train it later."
fi
echo "✓ ML model training completed"
echo ""

echo "[4/5] Checking MongoDB..."
if command -v mongod &> /dev/null; then
    echo "✓ MongoDB found"
else
    echo "Warning: MongoDB not found. Please install MongoDB."
fi
echo ""

echo "[5/5] Setup Complete!"
echo ""
echo "================================"
echo "Next Steps:"
echo "================================"
echo "1. Update backend/.env with your configuration"
echo "2. Start MongoDB: mongod"
echo "3. Start ML API: cd ml && python app.py"
echo "4. Start Backend: cd backend && npm run dev"
echo "5. Open frontend in browser"
echo ""
echo "For detailed instructions, see IMPLEMENTATION.md"
echo "================================"
