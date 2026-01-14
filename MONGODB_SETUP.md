# 🗄️ MongoDB Atlas Setup Guide

คู่มือการตั้งค่า MongoDB Atlas สำหรับ Smart Resort Management System

---

## 📋 ขั้นตอนที่ 1: สมัคร MongoDB Atlas (ฟรี)

### 1.1 สร้างบัญชี
```
1. ไปที่: https://www.mongodb.com/cloud/atlas/register
2. กรอกข้อมูล:
   - Email
   - Password
   - หรือ Sign up with Google
3. กด "Create your Atlas account"
```

### 1.2 สร้าง Organization & Project
```
1. Organization Name: "Resort Management" (หรือชื่อที่คุณต้องการ)
2. Project Name: "Smart Resort System"
3. กด "Create Project"
```

---

## 📋 ขั้นตอนที่ 2: สร้าง Free Cluster

### 2.1 เลือก Cluster Type
```
1. กด "Build a Database"
2. เลือก "M0" (FREE)
   ✅ 512 MB Storage
   ✅ Shared RAM
   ✅ ฟรีตลอดไป
3. กด "Create"
```

### 2.2 เลือก Cloud Provider & Region
```
Recommended Settings:
├─ Provider: AWS
├─ Region: ap-southeast-1 (Singapore)
│          หรือ ap-southeast-2 (Sydney)
│          ← ใกล้ไทยที่สุด, latency ต่ำ
└─ Cluster Name: Cluster0 (default)
```

### 2.3 กด "Create Cluster"
```
⏳ รอ 1-3 นาที (กำลังสร้าง cluster)
```

---

## 📋 ขั้นตอนที่ 3: Security Configuration

### 3.1 สร้าง Database User
```
1. จะเห็นหน้า "Security Quickstart"
2. Authentication Method: Username and Password
3. กรอก:
   Username: resortadmin
   Password: [สร้าง password ที่แข็งแรง]

   ⚠️ เก็บ password ไว้ดีๆ จะต้องใช้ตอนต่อไป!

4. User Privileges: Read and write to any database
5. กด "Create User"
```

### 3.2 Whitelist IP Address
```
1. เลื่อนลงไปที่ "Where would you like to connect from?"
2. เลือก "My Local Environment"
3. เพิ่ม IP Address:

   IP Address: 0.0.0.0/0
   Description: Allow all (for Vercel)

   ⚠️ นี่คือการอนุญาตทุก IP (จำเป็นสำหรับ Vercel)

4. กด "Add Entry"
5. กด "Finish and Close"
```

---

## 📋 ขั้นตอนที่ 4: Get Connection String

### 4.1 คัดลอก Connection String
```
1. ที่หน้า Database Deployments
2. กดปุ่ม "Connect" ของ Cluster0
3. เลือก "Connect your application"
4. Driver: Node.js
5. Version: 4.1 or later
6. คัดลอก Connection String:

mongodb+srv://resortadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

⚠️ แทนที่ <password> ด้วย password จริง!
```

### 4.2 แก้ไข Connection String
```
ตัวอย่าง:
จาก: mongodb+srv://resortadmin:<password>@cluster0.abc123.mongodb.net/
แก้เป็น: mongodb+srv://resortadmin:YourRealPassword123@cluster0.abc123.mongodb.net/resort

เพิ่ม /resort ท้ายสุด เพื่อระบุชื่อ database
```

---

## 📋 ขั้นตอนที่ 5: ตั้งค่าใน Vercel

### 5.1 เข้า Vercel Dashboard
```
1. ไปที่: https://vercel.com
2. เลือก Project: smart-resort-system
3. ไปที่: Settings → Environment Variables
```

### 5.2 เพิ่ม Environment Variables
```
Variable 1:
├─ Name: MONGODB_URI
├─ Value: mongodb+srv://resortadmin:YourPassword123@cluster0.xxx.mongodb.net/resort
└─ Environment: Production, Preview, Development (เลือกทั้งหมด)

Variable 2: (ถ้ายังไม่มี)
├─ Name: GEMINI_API_KEY
├─ Value: [Your Gemini API Key]
└─ Environment: Production, Preview, Development

Variable 3: (optional สำหรับ Gmail sync)
├─ Name: GMAIL_SYNC_SECRET
├─ Value: [Random string เช่น: abc123xyz789]
└─ Environment: Production, Preview, Development
```

### 5.3 Save และ Redeploy
```
1. กด "Save"
2. Vercel จะ redeploy อัตโนมัติ
3. รอ 1-2 นาที
```

---

## 📋 ขั้นตอนที่ 6: ทดสอบการเชื่อมต่อ

### 6.1 ทดสอบผ่าน API
```bash
# Test 1: ทดสอบ GET data (ควรได้ empty หรือ null ครั้งแรก)
curl https://smart-resort-system.vercel.app/api/data

# ผลลัพธ์ที่ถูกต้อง:
{"success":true,"data":null}
```

### 6.2 ทดสอบบันทึกข้อมูล
```bash
# Test 2: ทดสอบ POST data
curl -X POST https://smart-resort-system.vercel.app/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [],
    "bookings": [],
    "settings": {"resortName": "Test Resort"}
  }'

# ผลลัพธ์ที่ถูกต้อง:
{"success":true,"id":"...","message":"Data saved successfully"}
```

### 6.3 ทดสอบบนเว็บ
```
1. เปิด https://smart-resort-system.vercel.app
2. ลองเพิ่ม Transaction หรือ Booking
3. เปิดใน Browser อื่น (หรือเครื่องอื่น)
4. ข้อมูลควรจะ sync มาด้วย!
```

---

## 🔍 การตรวจสอบข้อมูลใน MongoDB

### ดูข้อมูลใน Database
```
1. ไปที่ MongoDB Atlas Dashboard
2. กด "Browse Collections"
3. เลือก Database: resort
4. เห็น Collections:
   ├─ bookings (รายการจอง)
   ├─ transactions (รายรับ-รายจ่าย)
   └─ data (ข้อมูลทั้งหมด backup)
```

---

## ⚠️ Troubleshooting

### ปัญหา: เชื่อมต่อไม่ได้
```
✅ ตรวจสอบ:
1. Password ถูกต้องไหม? (ไม่มี < >)
2. IP Whitelist มี 0.0.0.0/0 ไหม?
3. MONGODB_URI ใน Vercel ถูกต้องไหม?
4. Redeploy แล้วหรือยัง?
```

### ปัญหา: ข้อมูลไม่ sync
```
✅ ตรวจสอบ:
1. เปิด Browser Console (F12)
2. ดู Network tab
3. มี request ไปที่ /api/data ไหม?
4. Status code เป็น 200 ไหม?
```

### ปัญหา: "MONGODB_URI not configured"
```
✅ แก้ไข:
1. เข้า Vercel Settings → Environment Variables
2. เพิ่ม MONGODB_URI
3. Redeploy Project
```

---

## 📊 MongoDB Atlas Dashboard Features

### Useful Features:
```
1. 📊 Metrics
   - Database Operations
   - Network Traffic
   - Storage Usage

2. 🔍 Browse Collections
   - ดูข้อมูลทั้งหมด
   - แก้ไข document
   - ลบข้อมูล

3. 📁 Data Explorer
   - Query ข้อมูล
   - Create Index
   - Import/Export

4. 📈 Performance Advisor
   - แนะนำการ optimize
   - Index suggestions
```

---

## 🎯 สรุป

### ✅ เมื่อตั้งค่าเสร็จ คุณจะได้:

```
✅ ข้อมูล sync ข้ามเครื่อง
✅ ทีมงานใช้งานร่วมกันได้
✅ ข้อมูลปลอดภัยใน Cloud
✅ Auto backup โดย MongoDB Atlas
✅ Free 512MB storage
✅ 99.9% uptime SLA
```

---

## 📞 ติดปัญหา?

ติดต่อได้ที่:
- MongoDB Support: https://support.mongodb.com
- Discord: MongoDB Community
- Documentation: https://docs.mongodb.com/atlas/

---

**🎉 Happy Coding! พร้อมใช้งาน MongoDB Atlas แล้ว!**
