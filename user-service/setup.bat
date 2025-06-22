@echo off
REM User Service Startup Script for Windows
REM This script helps set up and run the user service

echo 🚀 Starting User Service Setup...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Install dependencies
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
) else (
    echo ✅ Dependencies already installed
)

REM Check if .env file exists
if not exist ".env" (
    if exist ".env.development" (
        echo 📄 Copying .env.development to .env...
        copy ".env.development" ".env" >nul
    ) else if exist ".env.template" (
        echo 📄 Copying .env.template to .env...
        copy ".env.template" ".env" >nul
        echo ⚠️  Please update the .env file with your actual configuration values.
    ) else (
        echo ❌ No environment file found. Please create a .env file or use .env.template
        pause
        exit /b 1
    )
)

echo ✅ Environment file ready

REM Create logs directory
if not exist "logs" (
    echo 📁 Creating logs directory...
    mkdir logs
)

REM Check if PostgreSQL is available (optional check)
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL client available
) else (
    echo ⚠️  PostgreSQL client not found. Make sure PostgreSQL is installed and accessible.
)

REM Run basic validation
echo 🔍 Running basic validation...
npm run lint 2>nul || echo ⚠️  Linting issues found (non-critical)

REM Run tests
echo 🧪 Running tests...
npm test 2>nul || echo ⚠️  Some tests failed (check configuration)

echo.
echo 🎉 User Service setup complete!
echo.
echo 📋 Next steps:
echo 1. Make sure PostgreSQL is running and accessible
echo 2. Update the .env file with your database credentials
echo 3. Run 'npm run dev' to start the development server
echo 4. The service will be available at http://localhost:3001
echo.
echo 🔧 Available commands:
echo   npm run dev     - Start development server with auto-reload
echo   npm start       - Start production server
echo   npm test        - Run tests
echo   npm run lint    - Check code style
echo.
echo 📚 API Documentation will be available at:
echo   http://localhost:3001/api/docs (when implemented)
echo   Health check: http://localhost:3001/api/health
echo.

pause
