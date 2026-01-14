# 🔐 Security Best Practices & Production Checklist

คู่มือความปลอดภัยและการตั้งค่าสำหรับ Production

---

## 📋 Pre-Production Checklist

### ✅ **1. Authentication & Authorization**

#### ตั้งค่า API Secret Key
```bash
# ใน Vercel Environment Variables
API_SECRET_KEY=your-super-secret-key-here-change-this
```

**วิธีสร้าง Secret Key ที่แข็งแรง:**
```bash
# Option 1: ใช้ OpenSSL
openssl rand -base64 32

# Option 2: ใช้ Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: ใช้เว็บ
# https://www.uuidgenerator.net/
```

#### การใช้งาน API Key
```javascript
// ฝั่ง Client (Frontend)
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.API_SECRET_KEY  // จาก environment
  },
  body: JSON.stringify(booking)
});
```

---

### ✅ **2. Database Security**

#### MongoDB Atlas Settings
```
1. ✅ Enable Database User Authentication
   Username: resortadmin
   Password: [strong password with special chars]

2. ✅ Network Access
   - Development: Your IP only
   - Production: 0.0.0.0/0 (Vercel) + your office IP

3. ✅ Enable Encryption at Rest (Free tier has this)

4. ✅ Enable Backup (Continuous backup available in M10+)
```

#### Connection String Security
```bash
# ❌ ห้ามทำ: Hard-code ใน code
const MONGO_URI = "mongodb+srv://user:password@..."

# ✅ ทำแบบนี้: ใช้ Environment Variables
const MONGO_URI = process.env.MONGODB_URI
```

---

### ✅ **3. Environment Variables**

#### ตัวแปรที่จำเป็น (Required)
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/resort

# API Keys
GEMINI_API_KEY=your-gemini-key
API_SECRET_KEY=your-api-secret

# Line Notification
LINE_NOTIFY_TOKEN=your-line-token

# Gmail Sync (Optional)
GMAIL_SYNC_SECRET=your-gmail-secret
```

#### ตรวจสอบว่าตั้งค่าครบหรือไม่
```typescript
// ใส่ใน API endpoint
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI not configured');
}
```

---

### ✅ **4. Input Validation**

#### ตัวอย่าง Bad Input ที่ต้องป้องกัน
```javascript
// XSS Attack
guestName: "<script>alert('hacked')</script>"

// SQL Injection (ถ้าใช้ SQL)
roomNumber: "101'; DROP TABLE bookings; --"

// Negative Amount
totalAmount: -1000

// Invalid Dates
checkOut: "2020-01-01"  // ในอดีต
```

#### วิธีป้องกัน (มีใน utils/validation.ts แล้ว)
```typescript
import { validateBooking, sanitizeString } from './utils/validation';

// Sanitize
booking.guestName = sanitizeString(booking.guestName);

// Validate
const validation = validateBooking(booking);
if (!validation.valid) {
  return res.status(400).json({ errors: validation.errors });
}
```

---

### ✅ **5. Rate Limiting**

#### ป้องกัน DDoS / Brute Force
```typescript
// มี middleware อยู่แล้วใน middleware/auth.ts
import { rateLimit } from './middleware/auth';

// ตัวอย่าง: จำกัด 100 requests ต่อนาที
app.use(rateLimit(100, 60000));
```

#### Vercel มี Rate Limiting built-in
```
Hobby Plan: 100 requests/10 seconds per IP
Pro Plan: Configurable
```

---

### ✅ **6. CORS Configuration**

#### Production CORS
```typescript
// ❌ Development (อนุญาตทุกคน)
res.setHeader('Access-Control-Allow-Origin', '*');

// ✅ Production (จำกัดเฉพาะ domain ของคุณ)
const allowedOrigins = [
  'https://smart-resort-system.vercel.app',
  'https://yourdomain.com'
];

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

---

### ✅ **7. Data Backup Strategy**

#### Automated Backup
```
1. MongoDB Atlas:
   - M0 (Free): Manual backup only
   - M10+: Continuous backup + Point-in-time restore

2. Custom Backup Script:
   - Export ทุกวัน 00:00
   - เก็บไว้ใน Google Drive / Dropbox
```

#### Manual Backup (ทำทุกสัปดาห์)
```bash
# Export database
mongoexport --uri="mongodb+srv://..." --collection=bookings --out=bookings.json

# Export all data
mongodump --uri="mongodb+srv://..." --out=./backup
```

---

### ✅ **8. Error Handling**

#### ❌ ห้ามแสดง Error Details ใน Production
```typescript
// ❌ ห้ามทำ
return res.status(500).json({
  error: error.stack,  // เผยข้อมูล sensitive
  query: req.body      // อาจมี password
});

// ✅ ทำแบบนี้
console.error('Internal error:', error);  // Log ใน server
return res.status(500).json({
  success: false,
  error: 'Internal server error',
  message: 'Please contact support'
});
```

---

### ✅ **9. Line Notify Setup**

#### ขั้นตอนการตั้งค่า
```
1. ไปที่: https://notify-bot.line.me/
2. เข้าสู่ระบบด้วย Line
3. กด "Generate Token"
4. ตั้งชื่อ: "Smart Resort Notifications"
5. เลือกกลุ่มที่จะส่งการแจ้งเตือน
6. คัดลอก Token
7. เพิ่มใน Vercel Environment Variables:
   LINE_NOTIFY_TOKEN=your-token-here
```

#### ทดสอบ Line Notify
```bash
curl -X POST https://notify-api.line.me/api/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "message=🏨 ทดสอบระบบแจ้งเตือน Smart Resort"
```

---

### ✅ **10. Monitoring & Logging**

#### ควรมี
```
1. ✅ Error Logging
   - Console.error() → Vercel Logs
   - Sentry.io (แนะนำ)

2. ✅ Performance Monitoring
   - Vercel Analytics (built-in)
   - Google Analytics

3. ✅ Uptime Monitoring
   - UptimeRobot (ฟรี)
   - Pingdom

4. ✅ Database Monitoring
   - MongoDB Atlas Dashboard
```

---

## 🚨 **Common Security Issues**

### 1. **Exposed Secrets**
```bash
# ❌ อย่าทำ: Commit .env file
git add .env

# ✅ ทำแบบนี้: Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### 2. **Weak Passwords**
```
❌ Bad: 123456, password, admin
✅ Good: X7$mK9#pQ2@vL4!wN8^zR6&tF3
```

### 3. **No Authentication**
```typescript
// ❌ Public API without auth
app.delete('/api/bookings/:id', async (req, res) => {
  await bookings.deleteOne({ id: req.params.id });
});

// ✅ With authentication
app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  // ... delete logic
});
```

---

## 🛡️ **Production Deployment Checklist**

```
Before deploying to production:

Security:
☐ API_SECRET_KEY configured
☐ MONGODB_URI uses strong password
☐ LINE_NOTIFY_TOKEN added
☐ .env files not in git
☐ CORS restricted to your domain
☐ Rate limiting enabled

Data:
☐ Validation functions active
☐ Concurrency control enabled
☐ Backup strategy in place
☐ Test data cleared

Monitoring:
☐ Error logging setup
☐ Uptime monitoring active
☐ Line notifications working
☐ MongoDB alerts configured

Testing:
☐ All API endpoints tested
☐ Authentication tested
☐ Validation tested
☐ Double-booking prevented
☐ Load testing done
```

---

## 📞 **Security Incident Response**

### หากพบช่องโหว่หรือถูกโจมตี:

1. **ระงับทันที**
   ```bash
   # Disable API temporarily
   # ใน Vercel: Pause deployments
   ```

2. **เปลี่ยน Secrets**
   ```bash
   # เปลี่ยน:
   - API_SECRET_KEY
   - MONGODB_URI (password)
   - LINE_NOTIFY_TOKEN
   ```

3. **ตรวจสอบ Logs**
   ```
   - Vercel Function Logs
   - MongoDB Atlas Logs
   - Line Notify history
   ```

4. **Restore Backup**
   ```bash
   mongorestore --uri="..." --dir=./backup
   ```

---

## 📚 **อ้างอิง**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Vercel Security](https://vercel.com/docs/security/security-best-practices)
- [Line Notify API](https://notify-bot.line.me/doc/)

---

**🔐 Stay Secure! ป้องกันดีกว่าแก้ไข!**
