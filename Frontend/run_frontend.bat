@echo off
echo ========================================
echo   FlowTest Frontend Development Server
echo ========================================
echo.
echo Starting development server...
echo.
IF NOT EXIST "node_modules\live-server" (
  echo Installing dependencies...
  npm install live-server --save-dev
)
echo.
echo Building CSS...
call npm run build:css
echo.
echo Starting server...
node run.js
pause