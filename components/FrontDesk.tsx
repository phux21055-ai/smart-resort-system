
import React, { useState, useRef, useEffect } from 'react';
import { processIDCardOCR } from '../services/geminiService';
import { GuestData, TransactionType, Category, CustomerType, Booking } from '../types';
import PrintableDocument from './PrintableDocument';
import CameraCapture from './CameraCapture';
import toast from 'react-hot-toast';
import { getRoomTypeByNumber, calculateNights, calculateTotalAmount, EXTRA_GUEST_PRICE } from '../config/rooms';

interface FrontDeskProps {
  onCheckIn: (data: { 
    guest: GuestData, 
    amount: number, 
    room: string, 
    description: string, 
    customerType: CustomerType,
    checkIn: string,
    checkOut: string
  }) => void;
  onQuickBooking: (booking: Omit<Booking, 'id' | 'status'>) => void;
  resortInfo: any;
}

const FrontDesk: React.FC<FrontDeskProps> = ({ onCheckIn, onQuickBooking, resortInfo }) => {
  const [mode, setMode] = useState<'CHECKIN' | 'QUICKBOOK'>('CHECKIN');
const FrontDesk: React.FC<FrontDeskProps> = ({ onCheckIn, resortInfo }) => {
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showDoc, setShowDoc] = useState<'NONE' | 'RR3' | 'RECEIPT' | 'TAX_INVOICE'>('NONE');
  const [inputMode, setInputMode] = useState<'SCAN' | 'MANUAL'>('SCAN');

  // Manual input fields
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualNationality, setManualNationality] = useState('ไทย');
  const [manualOccupation, setManualOccupation] = useState('');

  const [roomNumber, setRoomNumber] = useState('');
  const [extraGuests, setExtraGuests] = useState(0);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [totalAmount, setTotalAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [keyDeposit] = useState(300); // ค่าบริการมัดจำกุญแจ
  const [scanTimestamp, setScanTimestamp] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomType = getRoomTypeByNumber(roomNumber);
  const nights = calculateNights(checkInDate, checkOutDate);

  useEffect(() => {
    if (roomNumber && checkInDate && checkOutDate) {
      const amount = calculateTotalAmount(roomNumber, checkInDate, checkOutDate, extraGuests);
      setTotalAmount(amount);
      setDescription(`ค่าที่พัก ${roomType?.name || 'ห้อง ' + roomNumber} (${nights} คืน)${extraGuests > 0 ? ' + เสริม ' + extraGuests + ' ท่าน' : ''}`);
    }
  }, [roomNumber, checkInDate, checkOutDate, extraGuests, nights, roomType]);

  const handleOCRResult = async (base64Data: string) => {
    setIsScanning(true);
    try {
      const result = await processIDCardOCR(base64Data);

      // บันทึกเวลาที่สแกน
      const now = new Date();
      const timestamp = now.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setScanTimestamp(timestamp);

      setGuest(result);
      toast.success(`สแกนสำเร็จ: ${result.firstNameTH}`);
      setInputMode('SCAN'); // Switch back to view mode
    } catch (err: any) {
      toast.error("สแกนไม่สำเร็จ กรุณาลองใหม่หรือกรอกมือ");
    } finally {
      setIsScanning(false);
      setIsCameraOpen(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualName) {
      toast.error("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    // บันทึกเวลาที่กรอกมือ
    const now = new Date();
    const timestamp = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setScanTimestamp(timestamp);

    const manualGuest: GuestData = {
      idNumber: '-',
      title: '',
      firstNameTH: manualName,
      lastNameTH: '',
      firstNameEN: '',
      lastNameEN: '',
      address: '',
      dob: '',
      issueDate: '',
      expiryDate: '',
      phone: manualPhone,
      nationality: manualNationality,
      occupation: manualOccupation,
      customerType: CustomerType.CHECK_IN
    };

    setGuest(manualGuest);
    setInputMode('SCAN'); // Switch to view mode
    toast.success("บันทึกข้อมูลแขกสำเร็จ");
  };

  const handleReset = () => {
    setGuest(null);
    setRoomNumber('');
    setExtraGuests(0);
    setTotalAmount(0);
    setManualName('');
    setManualPhone('');
    setManualNationality('ไทย');
    setManualOccupation('');
    setInputMode('SCAN');
    setScanTimestamp('');
  };

    if (!guest || !roomNumber || totalAmount <= 0) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    onCheckIn({
      guest, room: roomNumber, amount: totalAmount,
      description,
      customerType: CustomerType.CHECK_IN,
      checkIn: checkInDate,
      checkOut: checkOutDate
    });
    setGuest(null);
    setRoomNumber('');
    setManualFirstName('');
    setManualLastName('');
    setManualPhone('');
    toast.success("เช็คอินเรียบร้อย");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800">ระบบฟรอนต์เดสก์</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Check-in Management</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setMode('CHECKIN')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === 'CHECKIN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>🛎️ เช็คอินแขก</button>
            <button onClick={() => setMode('QUICKBOOK')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === 'QUICKBOOK' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>📞 จองด่วน</button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Input Mode Toggle */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setInputMode('SCAN')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                  inputMode === 'SCAN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'
                }`}
              >
                📸 สแกนบัตร
              </button>
              <button
                onClick={() => setInputMode('MANUAL')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                  inputMode === 'MANUAL' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'
                }`}
              >
                ✍️ กรอกเอง
              </button>
            </div>

            {inputMode === 'SCAN' && (
              <>
                <button onClick={() => setIsCameraOpen(true)} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-xs font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">📸 เปิดกล้อง</button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all">📁 อัปโหลดรูป</button>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => handleOCRResult((ev.target?.result as string).split(',')[1]);
                    reader.readAsDataURL(file);
                  }
                }} />
              </>
            )}
          </div>

          {isScanning ? (
            <div className="py-20 text-center bg-indigo-50/50 rounded-[3rem] animate-pulse"><p className="text-indigo-600 font-black">AI กำลังอ่านข้อมูล...</p></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 bg-slate-50 p-8 rounded-[2.5rem] space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลผู้เข้าพัก</h4>

                {/* Manual Input Form */}
                {inputMode === 'MANUAL' && !guest ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">ชื่อ *</label>
                        <input
                          type="text"
                          placeholder="กรอกชื่อ"
                          value={manualFirstName}
                          onChange={(e) => setManualFirstName(e.target.value)}
                          className="w-full p-4 bg-white rounded-2xl font-bold border-2 border-slate-200 focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">นามสกุล *</label>
                        <input
                          type="text"
                          placeholder="กรอกนามสกุล"
                          value={manualLastName}
                          onChange={(e) => setManualLastName(e.target.value)}
                          className="w-full p-4 bg-white rounded-2xl font-bold border-2 border-slate-200 focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">เบอร์โทรศัพท์</label>
                      <input
                        type="tel"
                        placeholder="081-234-5678"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="w-full p-4 bg-white rounded-2xl font-bold border-2 border-slate-200 focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleManualSubmit}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      ✓ บันทึกข้อมูลแขก
                    </button>
                  </div>
                ) : guest ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        ข้อมูลพร้อมใช้งาน
                      </span>
                      <button
                        onClick={() => {
                          setGuest(null);
                          setInputMode('MANUAL');
                        }}
                        className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase"
                      >
                        ✏️ แก้ไข
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">ชื่อ-นามสกุล</label>
                        <input value={`${guest.title}${guest.firstNameTH} ${guest.lastNameTH}`} className="w-full p-4 bg-white rounded-2xl font-bold border-none shadow-sm" readOnly />
                    </div>
                    </div>
                    {guest.phone && (
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">เบอร์โทรศัพท์</label>
                        <input value={guest.phone} className="w-full p-4 bg-white rounded-2xl font-bold border-none shadow-sm" readOnly />
                      </div>
                    )}
                    {guest.idNumber !== '-' && (
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">เลขบัตรประชาชน</label>
                          <input value={guest.idNumber} className="w-full p-4 bg-white rounded-2xl font-bold border-none shadow-sm" readOnly />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">วันเกิด</label>
                          <input value={guest.dob} className="w-full p-4 bg-white rounded-2xl font-bold border-none shadow-sm" readOnly />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">ที่อยู่</label>
                          <textarea value={guest.address} className="w-full p-4 bg-white rounded-2xl font-bold border-none shadow-sm h-24" readOnly />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    {inputMode === 'SCAN' ? (
                      <>
                        <div className="bg-indigo-50 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">📸</div>
                        <p className="text-slate-400 font-bold text-sm">กรุณาสแกนบัตรประชาชนเพื่อดึงข้อมูล</p>
                        <p className="text-slate-300 text-xs mt-2">หรือเลือก "✍️ กรอกเอง" ด้านบน</p>
                      </>
                    ) : (
                      <>
                        <div className="bg-emerald-50 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">✍️</div>
                        <p className="text-slate-400 font-bold text-sm">กรอกข้อมูลแขกด้านบน</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-indigo-600 rounded-[3rem] p-8 text-white flex flex-col gap-6">
                <h4 className="font-black text-xl">รายละเอียดการเข้าพัก</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-200">เลขห้อง</label>
                      <input placeholder="เช่น 1, 2, 14" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="w-full bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-200">เสริม (300/คน)</label>
                      <input type="number" value={extraGuests} onChange={e => setExtraGuests(parseInt(e.target.value) || 0)} className="w-full bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-200">Check-in</label>
                      <input type="date" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} className="w-full bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-200">Check-out</label>
                      <input type="date" value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} className="w-full bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                    </div>
                  </div>
                  
                  {totalAmount > 0 && (
                    <div className="bg-white/10 p-5 rounded-2xl border border-white/20 space-y-1">
                      <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">ยอดชำระสุทธิ</p>
                      <p className="text-2xl font-black">฿{totalAmount.toLocaleString()}</p>
                      <p className="text-[9px] opacity-80">{description}</p>
                    </div>
                  )}

                  <button onClick={handleCompleteCheckIn} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">ยืนยันเช็คอิน</button>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <button onClick={() => setShowDoc('RR3')} className="bg-white/10 text-white p-2 rounded-xl text-[8px] font-black uppercase">ร.ร. 3</button>
                    <button onClick={() => setShowDoc('RECEIPT')} className="bg-white/10 text-white p-2 rounded-xl text-[8px] font-black uppercase">มัดจำ</button>
                    <button onClick={() => setShowDoc('TAX_INVOICE')} className="bg-white/10 text-white p-2 rounded-xl text-[8px] font-black uppercase">ใบเสร็จ</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCameraOpen && <CameraCapture onCapture={handleOCRResult} onClose={() => setIsCameraOpen(false)} />}
      
      {showDoc !== 'NONE' && guest && (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4" onClick={() => setShowDoc('NONE')}>
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                 <h3 className="font-black text-slate-800 uppercase tracking-tight">Document Preview</h3>
                 <button onClick={() => setShowDoc('NONE')} className="text-slate-400 font-bold hover:text-slate-600 px-4 transition-colors">✕ ปิด</button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100/50 p-10 flex justify-center">
                 <PrintableDocument guest={guest} type={showDoc} amount={totalAmount} roomNumber={roomNumber} description={description} resortInfo={resortInfo} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FrontDesk;
