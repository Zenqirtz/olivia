@echo off
echo ============================================
echo Smarternak Database Import Script
echo MySQL 8.0.42 Compatible
echo ============================================
echo.

REM Set MySQL connection details (modify as needed)
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=root

echo Importing Smarternak database...
echo Host: %MYSQL_HOST%
echo Port: %MYSQL_PORT%
echo User: %MYSQL_USER%
echo.

echo Please enter your MySQL root password when prompted.
echo.

REM Import the database
mysql -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p < db_smarternak_mysql8.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo ✅ Database imported successfully!
    echo ============================================
    echo.
    echo Default login credentials:
    echo Email: admin@smarternak.com
    echo Password: admin123
    echo.
    echo The database includes:
    echo - 2 admin users
    echo - 25 sample egg scan records
    echo - 2 ESP32 devices
    echo - 1 production batch
    echo - 1 sample report
    echo.
    echo You can now start the backend server:
    echo   cd backend
    echo   npm run dev
    echo.
) else (
    echo.
    echo ============================================
    echo ❌ Database import failed!
    echo ============================================
    echo.
    echo Please check:
    echo 1. MySQL is running
    echo 2. Correct username/password
    echo 3. MySQL is accessible on %MYSQL_HOST%:%MYSQL_PORT%
    echo.
)

pause 