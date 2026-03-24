# Smart Guard - Complete Setup Guide

## Overview
This document provides instructions for setting up and using all the new features implemented in the Smart Guard system.

## What Was Implemented

### 1. **Authentication System** ✅
- User Registration (Sign Up) with email verification
- User Sign In with secure password hashing
- Role-based access control (Admin vs Security Personnel)
- Protected routes that redirect unauthenticated users to login

### 2. **User Management Dashboard** ✅
- Admin Dashboard to view all users in organization
- User roles and status display
- Approve/decline signup requests
- Email notifications to moderators when new users sign up

### 3. **Sign Up Page** ✅
- Professional signup form matching login design
- Fields: Full Name, Email, Organization, Role Selection, Password
- Form validation with error messages in Arabic
- Navigation between login and signup pages

### 4. **Role-Based Features** ✅
- **Admin**: Can manage users, approve/decline signups
- **Security Personnel**: Can view monitoring data and logs
- Role selection during signup process

### 5. **Moderator Email Notifications** ✅
- Automatic emails sent to moderators when new signup requests are received
- Configurable recipient emails via environment variables
- HTML formatted email notifications

### 6. **Supabase Integration** ✅
- Database credentials configured
- API endpoints for user management
- Real-time data synchronization capability

### 7. **Inference Logs Export** ✅
- Download logs in CSV format
- Download logs in XLSX (Excel) format
- Backend automatically converts between formats

## Installation & Setup

### Backend Setup

1. **Navigate to Backend Directory**
   ```bash
   cd Backend
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   Create a `.env` file in the Backend directory:
   ```
   # Email Configuration (Gmail example)
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SENDER_EMAIL=your_email@gmail.com
   SENDER_PASSWORD=your_app_password
   
   # Moderator Emails
   MODERATOR_EMAIL_1=admin@smartguard.com
   MODERATOR_EMAIL_2=moderator@smartguard.com
   
   # Supabase Configuration
   SUPABASE_URL=https://chjonhyjqztktxspwlkd.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoam9uaHlqcXp0a3R4c3B3bGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTU3MTUsImV4cCI6MjA4ODY3MTcxNX0.6b-Ii-XJAIOTdvNVO_AOc1pKhjVw5_BTW-x9TDb34UI
   ```

4. **Run Backend Server**
   ```bash
   python start_backend.py
   ```
   Server will start at `http://127.0.0.1:8001`

### Frontend Setup

1. **Navigate to Frontend Directory**
   ```bash
   cd Frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Frontend will be available at `http://localhost:3000` or `http://localhost:5173` (Vite)

## API Endpoints

### Authentication Endpoints

#### POST `/auth/signup`
Register a new user (creates pending signup request)
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "أحمد سعد",
  "organization": "جامعة القاهرة",
  "role": "admin"  // or "security_man"
}
```

#### POST `/auth/signin`
Sign in user
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### GET `/auth/users`
Get all users (Admin only)

#### GET `/auth/signup-requests`
Get pending signup requests (Admin only)

#### POST `/auth/signup-requests/{request_id}/approve`
Approve a signup request (Admin only)

#### POST `/auth/signup-requests/{request_id}/decline`
Decline a signup request with reason (Admin only)
```json
{
  "reason": "البيانات غير صحيحة"
}
```

### Logs Endpoints

#### GET `/logs?format=csv`
Download inference logs in CSV format

#### GET `/logs?format=xlsx`
Download inference logs in XLSX format

## Frontend Components

### New Pages
- **SignupPage** (`src/pages/SignupPage.jsx`) - User registration
- **AdminDashboard** (`src/pages/AdminDashboard.jsx`) - User management

### New Services
- **authService** (`src/services/authService.js`) - Authentication API calls
- **supabaseConfig** (`src/config/supabaseConfig.js`) - Database configuration

### New Components
- **ProtectedRoute** (`src/components/ProtectedRoute.jsx`) - Route protection

### Updated Pages
- **LoginPage** - Added signup link
- **Dashboard** - Added CSV/XLSX export options
- **App** - Added routing, redirect to login page

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'security_man',
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Signup Requests Table
```sql
CREATE TABLE signup_requests (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'security_man',
  status TEXT NOT NULL DEFAULT 'pending',
  decline_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by TEXT
)
```

## Email Configuration

### Gmail Setup (Recommended)
1. Enable 2-step verification in your Google Account
2. Generate an App Password
3. Use the App Password in `SENDER_PASSWORD`

### Alternative Email Services
- Outlook/Microsoft: `smtp.outlook.com:587`
- Yahoo: `smtp.mail.yahoo.com:587`
- Custom SMTP: Configure `SMTP_SERVER` and `SMTP_PORT`

## Feature Usage

### User Registration Flow
1. User clicks "Sign Up" link
2. Fills in registration form with role selection
3. Moderator receives email notification
4. Admin approves/declines request
5. User can sign in once approved

### Admin Dashboard Usage
1. Admin logs in with admin account
2. Can view all organization users
3. Can see and manage pending signup requests
4. Can approve or decline requests with optional reason

### Export Logs
1. Dashboard page shows two export buttons
2. Click "حفظ CSV" for CSV format
3. Click "حفظ XLSX" for Excel format
4. Files automatically download

## Security Notes

1. **Password Storage**: Uses PBKDF2 hashing with salt
2. **Token Storage**: Tokens stored in localStorage (in production, use secure cookies)
3. **CORS**: Currently allows localhost only - update `allow_origins` for production
4. **API Authentication**: Uses Bearer token in Authorization header

## Common Issues & Solutions

### Issue: "Email already registered"
- **Cause**: Email exists in signup_requests or users table
- **Solution**: Use different email or wait for request to be processed

### Issue: "Account pending approval"
- **Cause**: Signup request not approved by admin
- **Solution**: Contact admin or check email for approval notification

### Issue: Email notifications not sending
- **Cause**: SMTP credentials or email configuration incorrect
- **Solution**: Verify `.env` file settings and check email logs

### Issue: XLSX download fails
- **Cause**: openpyxl not installed
- **Solution**: Run `pip install openpyxl`

## Future Enhancements

1. **JWT Tokens**: Replace simple tokens with proper JWT implementation
2. **Database Migration**: Move from SQLite to Supabase PostgreSQL
3. **Email Templates**: Create customizable HTML email templates
4. **Audit Logging**: Log all admin actions
5. **Two-Factor Authentication**: Add 2FA for enhanced security
6. **SSO Integration**: Integrate with SSO providers (Google, Microsoft)
7. **User Deactivation**: Add ability to deactivate/delete users
8. **Bulk Operations**: Approve/decline multiple requests at once

## Support & Troubleshooting

For detailed API documentation, visit:
- Backend: `http://127.0.0.1:8001/docs` (Swagger UI)
- Backend: `http://127.0.0.1:8001/redoc` (ReDoc)

## File Structure

```
Frontend/
├── src/
│   ├── config/
│   │   └── supabaseConfig.js      # Supabase configuration
│   ├── services/
│   │   └── authService.js         # Authentication API service
│   ├── components/
│   │   └── ProtectedRoute.jsx     # Protected route wrapper
│   ├── pages/
│   │   ├── LoginPage.jsx          # Updated with signup link
│   │   ├── SignupPage.jsx         # New signup page
│   │   ├── AdminDashboard.jsx     # New admin dashboard
│   │   └── Dashboard.jsx          # Updated with CSV/XLSX export
│   ├── App.jsx                    # Updated routing
│   └── styles/
│       └── Dashboard.css          # Updated with admin styles

Backend/
├── routers/
│   └── auth.py                    # New authentication router
├── services/
│   └── email_service.py           # New email service
├── utils/
│   └── log_converter.py           # CSV to XLSX converter
├── main.py                        # Updated with auth router
├── requirements.txt               # Python dependencies
└── .env                          # Environment variables
```

## Version History

- **v2.0.0** (Current)
  - Added authentication system
  - Added user management dashboard
  - Added email notifications
  - Added CSV/XLSX export
  - Role-based access control

---

**Last Updated**: March 10, 2026
**Created By**: Assistant
