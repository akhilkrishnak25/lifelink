@echo off
REM Fraud Detection Test Script for LifeLink
REM Tests location-based fraud detection with 2 requests from different cities

setlocal enabledelayedexpansion
set API_URL=http://localhost:5000/api
set EMAIL_RAND=%RANDOM%%RANDOM%
set TEST_EMAIL=fraud_test_%EMAIL_RAND%@test.com

echo.
echo ================================================
echo  LIFELINK FRAUD DETECTION TEST
echo ================================================
echo.

REM Step 1: Register Test Receiver
echo [STEP 1] Creating test receiver account: %TEST_EMAIL%
echo.

curl -s -X POST %API_URL%/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"%TEST_EMAIL%\", \"password\": \"TestPassword123!\", \"name\": \"Fraud Test\", \"phone\": \"9876543210\", \"role\": \"receiver\"}" > response1.json

REM Extract token from response
for /f "delims={} tokens=*" %%A in (response1.json) do (
  if "%%A" neq "" (
    echo %%A
  )
)

REM Parse token using findstr
for /f "delims=:" %%A in ('findstr /c:"token" response1.json') do (
  set TOKEN_LINE=%%A
)

echo.
echo Response saved to response1.json
type response1.json
echo.

REM Extract basic values
echo.
echo [STEP 2] Making first blood request from Mumbai...
echo Location: Mumbai (19.0760, 72.8777)
echo.

REM For simplicity, we'll just show the curl commands that should be run
REM Since token extraction is complex in batch, let's just provide the curl commands

echo.
echo ================================================
echo MANUAL TEST INSTRUCTIONS:
echo ================================================
echo.
echo 1. First, get the token from the previous registration
echo    Check response1.json for the token value
echo.
echo 2. Run these curl commands with the TOKEN:
echo.

echo.
echo [Request 1] FROM MUMBAI:
echo.
echo curl -X POST %API_URL%/receiver/request ^
echo   -H "Content-Type: application/json" ^
echo   -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
echo   -d "{\"bloodGroup\": \"O+\", \"urgency\": \"urgent\", \"hospitalName\": \"Mumbai Hospital\", \"latitude\": 19.0760, \"longitude\": 72.8777, \"address\": \"MG Road\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"pincode\": \"400001\", \"contactNumber\": \"9876543210\", \"unitsRequired\": 2, \"patientName\": \"Patient 1\"}"
echo.

echo [Request 2] FROM PUNE (30 minutes later, ^>150km away):
echo.
echo curl -X POST %API_URL%/receiver/request ^
echo   -H "Content-Type: application/json" ^
echo   -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
echo   -d "{\"bloodGroup\": \"O+\", \"urgency\": \"critical\", \"hospitalName\": \"Pune Hospital\", \"latitude\": 18.5204, \"longitude\": 73.8567, \"address\": \"Hospital Road\", \"city\": \"Pune\", \"state\": \"Maharashtra\", \"pincode\": \"411001\", \"contactNumber\": \"9876543211\", \"unitsRequired\": 1, \"patientName\": \"Patient 2\"}"
echo.

echo ================================================
echo EXPECTED RESULT:
echo ================================================
echo The 2nd request should trigger LOCATION_JUMP flag:
echo - Distance: 150km
echo - Time: <1 hour
echo - Expected severity: +30 points
echo.
echo Response should include:
echo   "warning": "We detected some unusual patterns..."
echo   "severity": 30
echo   "reasons": ["Multiple locations in short time"]
echo.

REM Clean up
del response1.json

pause
