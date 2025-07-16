# 🥚 Smarternak Backend API

Backend API untuk sistem monitoring kualitas telur Smarternak menggunakan Node.js dan Express.

## 📋 Features

- **🔐 Authentication & Authorization** - JWT-based dengan role management
- **👥 User Management** - CRUD operations untuk SuperAdmin
- **📊 Dashboard API** - Real-time data dan statistik
- **🥚 Egg Quality Data** - API untuk data scanning telur
- **🔧 ESP32 Integration** - Endpoint untuk perangkat IoT
- **📈 Analytics** - Weekly stats dan reporting
- **🛡️ Security** - Rate limiting, CORS, Helmet
- **📝 Validation** - Input validation dengan express-validator

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Database schema sudah diimport

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment variables**
```bash
# Copy dan edit file .env
cp .env.example .env
```

3. **Setup database**
Pastikan MySQL sudah terinstall dan buat database:
```sql
CREATE DATABASE db_smarternak;
```

Kemudian import schema:
```bash
mysql -u root -p db_smarternak < ../database_schema_simple.sql
```

4. **Configure database**
Edit file `.env` dengan kredensial database Anda:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=db_smarternak
DB_USER=smarternak_app
DB_PASSWORD=secure_app_password_2024!
```

5. **Start development server**
```bash
npm run dev
```

Server akan berjalan di `http://localhost:5000`

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login           - Login user
POST   /api/auth/logout          - Logout user
GET    /api/auth/verify          - Verify token
GET    /api/auth/profile         - Get user profile
PUT    /api/auth/profile         - Update profile
PUT    /api/auth/change-password - Change password
POST   /api/auth/register        - Register user (SuperAdmin only)
```

### User Management (SuperAdmin only)
```
GET    /api/users                - Get all users
GET    /api/users/stats          - Get user statistics
GET    /api/users/:id            - Get user by ID
PUT    /api/users/:id            - Update user
DELETE /api/users/:id            - Delete user
PUT    /api/users/:id/reset-password - Reset user password
```

### Dashboard
```
GET    /api/dashboard/summary        - Dashboard summary
GET    /api/dashboard/weekly-stats   - Weekly statistics
GET    /api/dashboard/recent-eggs    - Recent eggs data
GET    /api/dashboard/system-health  - System health status
```

### Health Check
```
GET    /health                   - API health status
```

## 🔐 Authentication

API menggunakan JWT (JSON Web Tokens) untuk authentication. Include token di header:

```
Authorization: Bearer <your-jwt-token>
```

### Default Users
```
SuperAdmin: superadmin@smarternak.com / superadmin123
Admin:      admin@smarternak.com / admin123
```

## 📊 Response Format

Semua API response menggunakan format standar:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## 🛡️ Security Features

- **Rate Limiting** - 100 requests per 15 minutes per IP
- **CORS** - Configured untuk frontend domain
- **Helmet** - Security headers
- **Input Validation** - Comprehensive validation
- **SQL Injection Protection** - Parameterized queries
- **Password Hashing** - bcrypt dengan salt rounds

## 🔧 Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=db_smarternak
DB_USER=smarternak_app
DB_PASSWORD=secure_app_password_2024!

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=24h

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
```

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js         # Database configuration
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── userController.js   # User management
│   └── dashboardController.js # Dashboard data
├── middleware/
│   ├── auth.js            # Authentication middleware
│   └── validation.js      # Input validation
├── routes/
│   ├── auth.js           # Auth routes
│   ├── users.js          # User routes
│   └── dashboard.js      # Dashboard routes
├── uploads/              # File uploads directory
├── .env                  # Environment variables
├── server.js            # Main server file
└── package.json         # Dependencies
```

## 🧪 Testing

### Manual Testing
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smarternak.com","password":"admin123"}'
```

## 🚀 Production Deployment

1. **Set production environment**
```env
NODE_ENV=production
```

2. **Use PM2 for process management**
```bash
npm install -g pm2
pm2 start server.js --name smarternak-api
```

3. **Setup reverse proxy (Nginx)**
```nginx
server {
    listen 80;
    server_name api.smarternak.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📝 Development

### Adding New Routes
1. Create controller in `controllers/`
2. Add validation in `middleware/validation.js`
3. Create route file in `routes/`
4. Register route in `server.js`

### Database Queries
Gunakan helper function `executeQuery` dari `config/database.js`:

```javascript
const { executeQuery } = require('../config/database');

const getUsers = async () => {
  const result = await executeQuery('SELECT * FROM users WHERE is_active = ?', [true]);
  return result;
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL service running
   - Verify credentials in `.env`
   - Ensure database exists

2. **JWT Token Invalid**
   - Check JWT_SECRET in `.env`
   - Verify token format in Authorization header

3. **CORS Errors**
   - Update FRONTEND_URL in `.env`
   - Check allowed origins in server.js

## 📞 Support

- **Documentation**: README.md
- **Issues**: GitHub Issues
- **Email**: tech@smarternak.com

---

**Smarternak Backend API** - Powering IoT egg quality monitoring 🥚✨ 