
import React, { useState, useRef, useEffect } from 'react';
import { processIDCardOCR } from '../services/geminiService';
import { GuestData, CustomerType, Booking } from '../types';
import { Camera, FileUp, CreditCard, BedDouble, Calendar, Users, Printer, X, CheckCircle2, Edit3 } from 'lucide-react';
import PrintableDocument from './PrintableDocument';
import CameraCapture from './CameraCapture';
import toast from 'react-hot-toast';
import { getRoomTypeByNumber, calculateNights, calculateTotalAmount } from '../config/rooms';

interface FrontDeskProps {
  onCheckIn: (data: any) => void;
  onQuickBooking: (booking: Omit<Booking, 'id' | 'status'>) => void;
  resortInfo: any;
}

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

  const handleCheckIn = () => {
    if (!guest || !roomNumber || totalAmount <= 0) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // คำนวณยอดรวม รวมค่ามัดจำกุญแจ
    const grandTotal = totalAmount + keyDeposit;

    onCheckIn({
      guest,
      room: roomNumber,
      amount: totalAmount,
      keyDeposit: keyDeposit,
      grandTotal: grandTotal,
      description: `${description} + มัดจำกุญแจ ฿${keyDeposit}`,
      customerType: CustomerType.CHECK_IN,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      scanTimestamp: scanTimestamp,
      nights: nights
    });

    handleReset();
    toast.success("เช็คอินเรียบร้อย ✓");
  };

  return (
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Front Desk</h1>
          <p className="text-slate-400 font-medium">จัดการการลงทะเบียนผู้เข้าพักและออกเอกสาร</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Guest Info */}
          <div className="lg:col-span-7 space-y-6">

            {/* Input Mode Toggle */}
            <div className="flex gap-3">
              <button
                  onClick={() => setInputMode('SCAN')}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all ${inputMode === 'SCAN' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
              >
                📸 สแกนบัตรประชาชน
              </button>
              <button
                  onClick={() => setInputMode('MANUAL')}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all ${inputMode === 'MANUAL' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
              >
                ✍️ กรอกข้อมูลมือ
              </button>
            </div>

            {/* Scan Mode */}
            {inputMode === 'SCAN' && !guest && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                      onClick={() => setIsCameraOpen(true)}
                      className="group bg-indigo-600 hover:bg-indigo-700 p-8 rounded-3xl text-white transition-all shadow-lg flex flex-col items-center gap-3 border-b-4 border-indigo-800"
                  >
                    <div className="bg-indigo-500/50 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                      <Camera size={32} />
                    </div>
                    <span className="font-bold text-lg">เปิดกล้อง</span>
                  </button>

                  <button
                      onClick={() => fileInputRef.current?.click()}
                      className="group bg-white hover:bg-slate-50 p-8 rounded-3xl text-slate-700 transition-all border-2 border-slate-200 flex flex-col items-center gap-3"
                  >
                    <div className="bg-slate-100 p-4 rounded-2xl group-hover:scale-110 transition-transform text-slate-500">
                      <FileUp size={32} />
                    </div>
                    <span className="font-bold text-lg text-slate-600">เลือกไฟล์</span>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => handleOCRResult((ev.target?.result as string).split(',')[1]);
                            reader.readAsDataURL(file);
                          }
                        }}
                    />
                  </button>
                </div>
            )}

            {/* Manual Mode */}
            {inputMode === 'MANUAL' && !guest && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <Edit3 size={20} />
                    </div>
                    <h3 className="font-bold text-slate-700">กรอกข้อมูลแขกด้วยตนเอง</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 ml-1">ชื่อ-นามสกุล *</label>
                      <input
                          type="text"
                          placeholder="นาย สมชาย ใจดี"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="w-full mt-1 p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 ml-1">เบอร์โทร</label>
                        <input
                            type="tel"
                            placeholder="081-234-5678"
                            value={manualPhone}
                            onChange={(e) => setManualPhone(e.target.value)}
                            className="w-full mt-1 p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 ml-1">สัญชาติ</label>
                        <input
                            type="text"
                            placeholder="ไทย"
                            value={manualNationality}
                            onChange={(e) => setManualNationality(e.target.value)}
                            className="w-full mt-1 p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 ml-1">อาชีพ</label>
                      <input
                          type="text"
                          placeholder="พนักงานบริษัท"
                          value={manualOccupation}
                          onChange={(e) => setManualOccupation(e.target.value)}
                          className="w-full mt-1 p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <button
                        onClick={handleManualSubmit}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95"
                    >
                      ✓ บันทึกข้อมูล
                    </button>
                  </div>
                </div>
            )}

            {/* Guest Info Display */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="font-bold text-slate-700">ข้อมูลผู้เข้าพัก</h3>
                </div>
                {guest && (
                    <button onClick={handleReset} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1">
                      <X size={14} /> ล้างข้อมูล
                    </button>
                )}
              </div>

              <div className="p-8">
                {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="font-bold text-slate-500 animate-pulse">AI กำลังวิเคราะห์บัตรประชาชน...</p>
                    </div>
                ) : guest ? (
                    <div className="grid grid-cols-2 gap-6 animate-in zoom-in-95 duration-300">
                      {scanTimestamp && (
                          <div className="col-span-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2">
                            <div className="text-emerald-600 font-black text-xs">⏱️ บันทึกเมื่อ:</div>
                            <div className="text-emerald-700 font-bold text-sm">{scanTimestamp}</div>
                          </div>
                      )}

                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ชื่อ-นามสกุล</label>
                        <div className="mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800">
                          {guest.title}{guest.firstNameTH} {guest.lastNameTH}
                        </div>
                      </div>

                      {guest.idNumber !== '-' && (
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">เลขประจำตัวประชาชน</label>
                            <div className="mt-1 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl font-mono font-bold text-indigo-700">
                              {guest.idNumber}
                            </div>
                          </div>
                      )}

                      {guest.phone && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">เบอร์โทร</label>
                            <div className="mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600">
                              {guest.phone}
                            </div>
                          </div>
                      )}

                      {guest.nationality && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">สัญชาติ</label>
                            <div className="mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600">
                              {guest.nationality}
                            </div>
                          </div>
                      )}

                      {guest.occupation && (
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">อาชีพ</label>
                            <div className="mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600">
                              {guest.occupation}
                            </div>
                          </div>
                      )}

                      {guest.address && guest.idNumber !== '-' && (
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ที่อยู่ตามบัตร</label>
                            <div className="mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm leading-relaxed text-slate-600">
                              {guest.address}
                            </div>
                          </div>
                      )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/30 text-slate-300">
                      <CreditCard size={48} strokeWidth={1} />
                      <p className="mt-4 font-bold uppercase tracking-wider text-xs">
                        {inputMode === 'SCAN' ? 'เลือก "เปิดกล้อง" หรือ "เลือกไฟล์" ด้านบน' : 'กรอกข้อมูลในฟอร์มด้านบน'}
                      </p>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Booking Summary */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl sticky top-6">
              <h3 className="text-xl font-bold flex items-center gap-3 mb-8">
                <BedDouble className="text-indigo-400" />
                สรุปรายละเอียดการจอง
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 ml-1">เลขห้องพัก</label>
                    <input
                        placeholder="101"
                        value={roomNumber}
                        onChange={e => setRoomNumber(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 ml-1">เสริมผู้ใหญ่</label>
                    <div className="relative">
                      <input
                          type="number"
                          value={extraGuests}
                          onChange={e => setExtraGuests(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <Users size={16} className="absolute right-4 top-5 text-slate-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 ml-1 flex items-center gap-1">
                      <Calendar size={12} /> Check-in
                    </label>
                    <input
                        type="date"
                        value={checkInDate}
                        onChange={e => setCheckInDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 ml-1 flex items-center gap-1">
                      <Calendar size={12} /> Check-out
                    </label>
                    <input
                        type="date"
                        value={checkOutDate}
                        onChange={e => setCheckOutDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Receipt Summary */}
                {roomNumber && totalAmount > 0 && (
                    <div className="bg-indigo-950/50 border border-indigo-900/50 rounded-[2rem] p-6 space-y-4">
                      <div className="flex justify-between items-end border-b border-indigo-900/50 pb-4">
                        <span className="text-sm font-bold text-indigo-300">รายละเอียดยอดรวม</span>
                        <span className="text-xs bg-indigo-600 px-3 py-1 rounded-full">{nights} คืน</span>
                      </div>

                      <div className="space-y-2 py-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">{roomType?.name || 'ค่าที่พัก'}</span>
                          <span>฿{((roomType?.price || 0) * nights).toLocaleString()}</span>
                        </div>
                        {extraGuests > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">เตียงเสริม (x{extraGuests})</span>
                              <span>฿{(extraGuests * 300 * nights).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-indigo-900/30 pt-2">
                          <span className="text-slate-400">มัดจำกุญแจ</span>
                          <span>฿{keyDeposit.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center pt-2 border-t border-indigo-900/50">
                          <span className="text-sm text-slate-400">ค่าที่พัก</span>
                          <span className="text-lg font-bold text-white">฿{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                          <span className="font-black text-emerald-400 text-lg">ยอดรวมทั้งหมด</span>
                          <span className="text-3xl font-black text-emerald-400">฿{(totalAmount + keyDeposit).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <button
                      disabled={!guest || !roomNumber}
                      onClick={handleCheckIn}
                      className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${guest && roomNumber ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                  >
                    <CheckCircle2 size={24} />
                    {!guest ? '① กรอกข้อมูลแขกก่อน' : !roomNumber ? '② กรอกเลขห้อง' : 'ยืนยันเช็คอิน'}
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setShowDoc('RR3')}
                        disabled={!guest}
                        className="flex flex-col items-center gap-1 py-3 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Printer size={16} /> ร.ร. ๓
                    </button>
                    <button
                        onClick={() => setShowDoc('RECEIPT')}
                        disabled={!guest}
                        className="flex flex-col items-center gap-1 py-3 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Printer size={16} /> ใบมัดจำ
                    </button>
                    <button
                        onClick={() => setShowDoc('TAX_INVOICE')}
                        disabled={!guest}
                        className="flex flex-col items-center gap-1 py-3 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Printer size={16} /> ใบเสร็จ
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Camera Modal */}
        {isCameraOpen && <CameraCapture onCapture={handleOCRResult} onClose={() => setIsCameraOpen(false)} />}

        {/* Document Preview Modal */}
        {showDoc !== 'NONE' && guest && (
            <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4" onClick={() => setShowDoc('NONE')}>
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                  <h3 className="font-black text-slate-800 uppercase tracking-tight">Document Preview</h3>
                  <button onClick={() => setShowDoc('NONE')} className="text-slate-400 font-bold hover:text-slate-600 px-4 transition-colors">✕ ปิด</button>
                </div>
                <div className="flex-1 overflow-auto bg-slate-100/50 p-10 flex justify-center">
                  <PrintableDocument
                      guest={guest}
                      type={showDoc}
                      amount={totalAmount}
                      roomNumber={roomNumber}
                      description={description}
                      resortInfo={resortInfo}
                      checkInDate={checkInDate}
                      checkOutDate={checkOutDate}
                  />
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default FrontDesk;
