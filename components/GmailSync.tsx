import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Booking } from '../types';

interface GmailSyncProps {
  onBookingImported: (booking: Omit<Booking, 'id' | 'status'>) => void;
}

interface SyncLog {
  id: string;
  timestamp: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  status: 'success' | 'error';
  message?: string;
}

const GmailSync: React.FC<GmailSyncProps> = ({ onBookingImported }) => {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(() => {
    const saved = localStorage.getItem('gmail_sync_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    localStorage.setItem('gmail_sync_logs', JSON.stringify(syncLogs));
  }, [syncLogs]);

  useEffect(() => {
    // Check if configuration exists
    const savedUrl = localStorage.getItem('gmail_sync_api_url');
    const savedSecret = localStorage.getItem('gmail_sync_secret');
    if (savedUrl && savedSecret) {
      setApiUrl(savedUrl);
      setSecretKey(savedSecret);
      setIsConfigured(true);
    }
  }, []);

  const saveConfiguration = () => {
    if (!apiUrl || !secretKey) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    localStorage.setItem('gmail_sync_api_url', apiUrl);
    localStorage.setItem('gmail_sync_secret', secretKey);
    setIsConfigured(true);
    setShowSetup(false);
    toast.success('บันทึกการตั้งค่าสำเร็จ');
  };

  const clearConfiguration = () => {
    if (confirm('ต้องการลบการตั้งค่า Gmail Sync หรือไม่?')) {
      localStorage.removeItem('gmail_sync_api_url');
      localStorage.removeItem('gmail_sync_secret');
      setApiUrl('');
      setSecretKey('');
      setIsConfigured(false);
      toast.success('ลบการตั้งค่าสำเร็จ');
    }
  };

  const clearLogs = () => {
    if (confirm('ต้องการลบประวัติการนำเข้าทั้งหมดหรือไม่?')) {
      setSyncLogs([]);
      toast.success('ลบประวัติสำเร็จ');
    }
  };

  const getStatusBadge = (status: 'success' | 'error') => {
    if (status === 'success') {
      return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">สำเร็จ</span>;
    }
    return <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">ล้มเหลว</span>;
  };

  const getGoogleAppsScriptCode = () => {
    return `// Gmail to Resort Booking Sync
// ใช้โค้ดนี้ใน Google Apps Script

const API_URL = '${apiUrl}';
const API_SECRET = '${secretKey}';

function syncBookingEmails() {
  try {
    // ค้นหาอีเมลจาก Booking.com ที่ยังไม่ได้อ่าน
    const threads = GmailApp.search('from:booking.com is:unread', 0, 10);

    Logger.log('พบอีเมลใหม่: ' + threads.length + ' รายการ');

    for (let i = 0; i < threads.length; i++) {
      const messages = threads[i].getMessages();

      for (let j = 0; j < messages.length; j++) {
        const message = messages[j];

        // เตรียมข้อมูล
        const emailData = {
          subject: message.getSubject(),
          body: message.getPlainBody(),
          from: message.getFrom(),
          date: message.getDate().toISOString()
        };

        // ส่งไปยัง API
        const options = {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'X-Api-Secret': API_SECRET
          },
          payload: JSON.stringify(emailData)
        };

        try {
          const response = UrlFetchApp.fetch(API_URL, options);
          const result = JSON.parse(response.getContentText());

          if (result.success) {
            Logger.log('✅ นำเข้าสำเร็จ: ' + emailData.subject);
            message.markRead();
          } else {
            Logger.log('❌ นำเข้าล้มเหลว: ' + result.message);
          }
        } catch (e) {
          Logger.log('❌ API Error: ' + e.message);
        }
      }
    }

    Logger.log('เสร็จสิ้นการซิงค์');
  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}

// ตั้งเวลารันอัตโนมัติ
// 1. ไปที่ Triggers (นาฬิกาด้านซ้าย)
// 2. เพิ่ม Trigger ใหม่
// 3. เลือก Function: syncBookingEmails
// 4. Event source: Time-driven
// 5. Type: Minutes timer
// 6. Interval: ทุก 5 หรือ 10 นาที
`;
  };

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(getGoogleAppsScriptCode());
    toast.success('คัดลอกโค้ดสำเร็จ');
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`rounded-[2.5rem] p-8 shadow-2xl ${
        isConfigured
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
          : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
      }`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4">
              📧
            </div>
            <h3 className="text-xl font-black mb-2">Gmail Auto-Import</h3>
            <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
              {isConfigured ? 'พร้อมใช้งาน - รอการซิงค์อัตโนมัติ' : 'ยังไม่ได้ตั้งค่า'}
            </p>
          </div>
          <div className="flex gap-2">
            {isConfigured && (
              <button
                onClick={clearConfiguration}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                ลบการตั้งค่า
              </button>
            )}
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="bg-white text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xl"
            >
              {showSetup ? 'ซ่อน' : isConfigured ? 'ดูการตั้งค่า' : 'ตั้งค่า'}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-[9px] font-black opacity-70 uppercase mb-1">นำเข้าทั้งหมด</p>
            <p className="text-2xl font-black">{syncLogs.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-[9px] font-black opacity-70 uppercase mb-1">สำเร็จ</p>
            <p className="text-2xl font-black text-emerald-300">
              {syncLogs.filter(l => l.status === 'success').length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-[9px] font-black opacity-70 uppercase mb-1">ล้มเหลว</p>
            <p className="text-2xl font-black text-rose-300">
              {syncLogs.filter(l => l.status === 'error').length}
            </p>
          </div>
        </div>
      </div>

      {/* Setup Panel */}
      {showSetup && (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-2 border-slate-100">
          <h4 className="text-lg font-black text-slate-800 mb-6">การตั้งค่า Gmail Auto-Import</h4>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                API Endpoint URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://your-domain.vercel.app/api/bookings/import"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                API Secret Key
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="your-secret-key"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-mono text-sm"
              />
            </div>
          </div>

          <button
            onClick={saveConfiguration}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
          >
            บันทึกการตั้งค่า
          </button>

          {isConfigured && (
            <>
              <div className="mt-8 pt-8 border-t-2 border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-sm font-black text-slate-800">Google Apps Script</h5>
                  <button
                    onClick={copyScriptToClipboard}
                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all"
                  >
                    📋 คัดลอกโค้ด
                  </button>
                </div>
                <div className="bg-slate-900 rounded-2xl p-6 overflow-auto max-h-96">
                  <pre className="text-emerald-400 text-xs font-mono whitespace-pre-wrap">
                    {getGoogleAppsScriptCode()}
                  </pre>
                </div>
                <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-amber-900 mb-2">📝 วิธีใช้งาน:</p>
                  <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                    <li>คัดลอกโค้ดด้านบน</li>
                    <li>ไปที่ <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">script.google.com</a></li>
                    <li>สร้าง Project ใหม่และวางโค้ด</li>
                    <li>ตั้ง Trigger รันทุก 5-10 นาที</li>
                    <li>อนุญาต Gmail API permissions</li>
                  </ol>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sync Logs */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-black text-slate-800">ประวัติการนำเข้า</h4>
          {syncLogs.length > 0 && (
            <button
              onClick={clearLogs}
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all"
            >
              ลบประวัติ
            </button>
          )}
        </div>

        {syncLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 font-bold text-sm">ยังไม่มีประวัติการนำเข้า</p>
            <p className="text-slate-300 text-xs mt-2">เมื่อระบบทำงาน ประวัติจะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-auto">
            {syncLogs.slice().reverse().map((log) => (
              <div key={log.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(log.status)}
                    <p className="text-xs text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">แขก</p>
                    <p className="text-sm font-bold text-slate-800">{log.guestName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">เช็คอิน</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(log.checkIn).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">เช็คเอาต์</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(log.checkOut).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">ยอดเงิน</p>
                    <p className="text-sm font-black text-indigo-600">฿{log.amount.toLocaleString()}</p>
                  </div>
                </div>
                {log.message && (
                  <p className="mt-2 text-xs text-rose-600 font-medium">{log.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GmailSync;
