# Smart Guard - Quick Start Guide

## Prerequisites
- Python 3.8+
- Node.js 16+
- Git (optional)
- Gmail/Email account for notifications (optional)

## Quick Start (5 Minutes)

### Step 1: Start Backend Server

#### Terminal 1 - Backend
```bash
cd Backend
pip install -r requirements.txt
python start_backend.py
```

✅ Backend running at: `http://127.0.0.1:8001`

### Step 2: Start Frontend Server

#### Terminal 2 - Frontend
```bash
cd Frontend
npm install
npm run dev
```

✅ Frontend running at: `http://localhost:3000` or `http://localhost:5173`

### Step 3: Open Browser
Visit: **http://localhost:3000**

You will automatically be redirected to the **login page**

---

## Test the Features

### 1. **Signup Test**
1. Click "انشئ حساب جديد" (Create Account)
2. Fill in the form:
   - Name: `أحمد سعد`
   - Email: `ahmed@test.com`
   - Organization: `جامعة القاهرة`
   - Role: `موظف أمن عادي` (Security Personnel)
   - Password: `password123`
3. Click "إنشاء الحساب"
4. ✅ You should see: "تم إرسال طلب التسجيل بنجاح"

### 2. **Admin Approval Test**
1. In a new browser tab/incognito, login with:
   - Email: `admin@smartguard.com`
   - Password: `admin123`
2. Click "Admin Dashboard" (if available)
3. Go to "الطلبات المعلقة" (Pending Requests) tab
4. Approve or decline the signup request

### 3. **Login After Approval**
1. Go back to login page
2. Login with your signup email: `ahmed@test.com`
3. Password: `password123`
4. ✅ Should redirect to appropriate dashboard based on role

### 4. **Download Logs**
1. Go to Dashboard
2. At the bottom, click either:
   - "حفظ CSV" - Downloads inference logs as CSV
   - "حفظ XLSX" - Downloads inference logs as Excel

---

## Database Setup

Database is **automatically created** on first run. No additional setup needed!

Files created:
- `Backend/smartguard.db` - SQLite database
- `Backend/inference_logs.csv` - Log file
- `Backend/inference_logs.xlsx` - Excel logs (auto-generated)

---

## Email Notifications Setup (Optional)

### For Gmail:
1. Enable 2-Step Verification in Google Account
2. Generate App Password
3. Create `.env` file in Backend folder:

```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password

MODERATOR_EMAIL_1=admin@smartguard.com
MODERATOR_EMAIL_2=moderator@smartguard.com
```

Without `.env`, emails are logged to console instead of sent (for testing).

---

## API Documentation

After starting the backend, visit:
- **Swagger Docs**: http://127.0.0.1:8001/docs
- **ReDoc**: http://127.0.0.1:8001/redoc

---

## Common Test Accounts

| Role | Email | Password | Status |
|------|-------|----------|--------|
| Admin | admin@smartguard.com | admin123 | Pre-configured |
| Security | user@smartguard.com | user123 | Pre-configured |

*Note: These are examples. Actual accounts are created through signup process.*

---

## File Downloads

### CSV Export
- Downloaded to user's downloads folder
- Format: `inference-logs-2026-03-10.csv`
- Readable in Excel, Google Sheets, or text editor

### XLSX Export
- Downloaded to user's downloads folder
- Format: `inference-logs-2026-03-10.xlsx`
- Opens directly in Excel with formatting

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8001 (Windows)
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Kill process on port 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9
```

### Module Not Found / Import Error
```bash
# Backend: Reinstall dependencies
cd Backend
pip install --upgrade -r requirements.txt

# Frontend: Clear cache and reinstall
cd Frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Issues
```bash
# Delete and recreate database
cd Backend
rm smartguard.db
python start_backend.py  # Recreates automatically
```

### Email Not Sending
1. Check `.env` file exists with correct credentials
2. Check SMTP settings for your email service
3. Enable "Less secure apps" for Gmail (if applicable)
4. Check console for error messages

---

## Project Structure

```
Smart-guard-master/
├── Frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx          ✨ NEW
│   │   │   ├── AdminDashboard.jsx      ✨ NEW
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   └── authService.js          ✨ NEW
│   │   ├── config/
│   │   │   └── supabaseConfig.js       ✨ NEW
│   │   └── App.jsx                     (Updated)
│   └── package.json
│
├── Backend/
│   ├── routers/
│   │   └── auth.py                     ✨ NEW
│   ├── services/
│   │   └── email_service.py            ✨ NEW
│   ├── utils/
│   │   └── log_converter.py            ✨ NEW
│   ├── main.py                         (Updated)
│   ├── requirements.txt                ✨ NEW
│   └── smartguard.db                   (Auto-created)
│
├── SETUP_GUIDE.md                      ✨ NEW
├── CHANGES_SUMMARY.md                  ✨ NEW
└── QUICK_START.md                      (This file)

✨ = New or significantly updated
```

---

## Performance Tips

1. **First Load**: Takes 10-15 seconds (dependencies loading)
2. **Subsequent Loads**: 2-3 seconds
3. **Export Large Logs**: May take 5-10 seconds

### Optimize Performance:
- Use Chrome/Firefox (faster than Safari on React)
- Close unnecessary browser tabs
- Clear browser cache periodically
- Use `npm run build` for production bundle

---

## Important Notes

⚠️ **For Production Use:**
- Configure real database (Supabase PostgreSQL)
- Use proper JWT tokens (not simple strings)
- Enable HTTPS only
- Implement rate limiting
- Add proper error handling
- Configure logging and monitoring
- Use environment variables for all secrets
- Add unit and integration tests

---

## Support

For detailed documentation, see:
- `SETUP_GUIDE.md` - Complete setup guide
- `CHANGES_SUMMARY.md` - All changes made
- `/docs` - API documentation (Swagger)

---

## Success Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads at localhost
- [ ] Redirects to login page automatically
- [ ] Can create account via signup
- [ ] Receive notification (email or console)
- [ ] Can approve/decline signup as admin
- [ ] Can login after approval
- [ ] Dashboard loads correctly
- [ ] Can download CSV logs
- [ ] Can download XLSX logs

**When all checked: You're ready to use Smart Guard! 🎉**

---

**Last Updated**: March 10, 2026
**Version**: 2.0.0
