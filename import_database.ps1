# ============================================
# Smarternak Database Import Script (PowerShell)
# MySQL 8.0.42 Compatible
# ============================================

Write-Host "============================================" -ForegroundColor Green
Write-Host "Smarternak Database Import Script" -ForegroundColor Green
Write-Host "MySQL 8.0.42 Compatible" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Configuration
$MYSQL_HOST = "localhost"
$MYSQL_PORT = "3306"
$MYSQL_USER = "root"
$DATABASE_FILE = "db_smarternak_mysql8.sql"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "Host: $MYSQL_HOST" -ForegroundColor White
Write-Host "Port: $MYSQL_PORT" -ForegroundColor White
Write-Host "User: $MYSQL_USER" -ForegroundColor White
Write-Host "Database File: $DATABASE_FILE" -ForegroundColor White
Write-Host ""

# Check if database file exists
if (-not (Test-Path $DATABASE_FILE)) {
    Write-Host "❌ Error: Database file '$DATABASE_FILE' not found!" -ForegroundColor Red
    Write-Host "Please make sure the file exists in the current directory." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if mysql command is available
try {
    $null = Get-Command mysql -ErrorAction Stop
    Write-Host "✅ MySQL command line client found" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: MySQL command line client not found!" -ForegroundColor Red
    Write-Host "Please make sure MySQL is installed and added to PATH." -ForegroundColor Yellow
    Write-Host "You can download MySQL from: https://dev.mysql.com/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "Starting database import..." -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# Prompt for password securely
$password = Read-Host "Enter MySQL root password" -AsSecureString
$passwordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

try {
    # Test connection first
    Write-Host "Testing MySQL connection..." -ForegroundColor Cyan
    $testCommand = "mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$passwordText -e 'SELECT VERSION();'"
    $result = Invoke-Expression $testCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MySQL connection successful" -ForegroundColor Green
        Write-Host ""
        
        # Import database
        Write-Host "Importing database from $DATABASE_FILE..." -ForegroundColor Cyan
        $importCommand = "mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$passwordText"
        Get-Content $DATABASE_FILE | & mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$passwordText
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "============================================" -ForegroundColor Green
            Write-Host "✅ Database imported successfully!" -ForegroundColor Green
            Write-Host "============================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Database 'db_smarternak' has been created with:" -ForegroundColor White
            Write-Host "- 2 admin users" -ForegroundColor White
            Write-Host "- 25 sample egg scan records" -ForegroundColor White
            Write-Host "- 2 ESP32 devices" -ForegroundColor White
            Write-Host "- 1 production batch" -ForegroundColor White
            Write-Host "- 1 sample report" -ForegroundColor White
            Write-Host ""
            Write-Host "Default login credentials:" -ForegroundColor Cyan
            Write-Host "Email: admin@smarternak.com" -ForegroundColor White
            Write-Host "Password: admin123" -ForegroundColor White
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Yellow
            Write-Host "1. Update your .env file with database credentials" -ForegroundColor White
            Write-Host "2. Start the backend server:" -ForegroundColor White
            Write-Host "   cd backend" -ForegroundColor Gray
            Write-Host "   npm run dev" -ForegroundColor Gray
            Write-Host ""
        } else {
            throw "Database import failed"
        }
    } else {
        throw "MySQL connection failed"
    }
} catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "❌ Database import failed!" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. MySQL server is running (Laragon/XAMPP)" -ForegroundColor White
    Write-Host "2. Correct username and password" -ForegroundColor White
    Write-Host "3. MySQL is accessible on $MYSQL_HOST`:$MYSQL_PORT" -ForegroundColor White
    Write-Host "4. No other database with same name exists" -ForegroundColor White
    Write-Host ""
}

# Clear password from memory
$passwordText = $null

Read-Host "Press Enter to exit" 