import React from 'react';
import { GuestData } from '../types';

interface PrintableDocumentProps {
  guest: GuestData;
  type: 'RR3' | 'RECEIPT' | 'TAX_INVOICE';
  amount: number;
  roomNumber: string;
  description: string;
  checkInDate?: string;
  checkOutDate?: string;
  resortInfo: {
    resortName: string;
    resortAddress: string;
    taxId: string;
    phone: string;
  };
}

const PrintableDocument: React.FC<PrintableDocumentProps> = ({
                                                               guest, type, amount, roomNumber, description, resortInfo, checkInDate, checkOutDate
                                                             }) => {

  const vatRate = 0.07;
  const preVat = amount / (1 + vatRate);
  const vat = amount - preVat;

  // ฟังก์ชันวาดช่องตารางสำหรับเลขบัตรประชาชน
  const renderIDBoxes = (id: string) => {
    const chars = id.replace(/-/g, '').padEnd(13, ' ').split('');
    return (
        <div className="flex items-center gap-1 font-mono text-lg">
          {chars.map((char, i) => (
              <React.Fragment key={i}>
                <span className="border border-black w-6 h-7 flex items-center justify-center bg-white">{char}</span>
                {(i === 0 || i === 4 || i === 9 || i === 11) && <span className="mx-0.5">-</span>}
              </React.Fragment>
          ))}
        </div>
    );
  };

  // --- แบบฟอร์ม ร.ร. ๓ (ตามรูปต้นฉบับ) ---
  const renderRR3 = () => (
      <div className="p-4 text-black bg-white min-h-screen font-serif relative">
        <div className="text-right font-bold text-lg mb-2 text-[14pt]">ร.ร. ๓</div>
        <div className="border-2 border-black p-8 space-y-4">
          <div className="text-center">
            <h2 className="text-[16pt] font-bold">บัตรทะเบียนผู้พักโรงแรม {resortInfo.resortName}</h2>
            <p className="text-[12pt] italic">(Lodger Registration Card)</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 border-t pt-4 border-slate-300">
            <div className="flex gap-2">
              <span>ชื่อตัว (Name):</span>
              <span className="flex-1 border-b border-dotted border-black px-2">{guest.firstNameTH}</span>
            </div>
            <div className="flex gap-2">
              <span>ชื่อสกุล (Surname):</span>
              <span className="flex-1 border-b border-dotted border-black px-2">{guest.lastNameTH}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 py-2">
            <span>เลขประจำตัวประชาชน:</span>
            {renderIDBoxes(guest.idNumber)}
          </div>
          <div className="text-[10pt] text-gray-500 italic mt--1">(Identification Card No.)</div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex gap-2">
              <span>หนังสือเดินทางเลขที่ (Passport No.):</span>
              <span className="flex-1 border-b border-dotted border-black px-2">-</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2">
              <span>อาชีพ (Occupation):</span>
              <span className="flex-1 border-b border-dotted border-black px-2">{guest.occupation || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span>สัญชาติ (Nationality):</span>
              <span className="flex-1 border-b border-dotted border-black px-2">{guest.nationality || 'ไทย'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="shrink-0">ที่อยู่ปัจจุบัน (Current Address):</span>
              <span className="flex-1 border-b border-dotted border-black px-2 text-sm">{guest.address}</span>
            </div>
            <div className="flex gap-2">
              <span>หมายเลขโทรศัพท์ (Telephone No.):</span>
              <span className="flex-1 border-b border-dotted border-black px-2">-</span>
            </div>
          </div>

          <div className="pt-6 space-y-4 text-sm">
            <div>
              <p>1. เดินทางมาจากสถานที่ใด (Place of Departure)</p>
              <div className="ml-6 flex items-center gap-2 mt-2">
                <div className="w-4 h-4 border border-black text-center text-xs">✓</div>
                <span>1.1 เดินทางมาจากที่อยู่ปัจจุบันที่เป็นภูมิลำเนาข้างต้น</span>
              </div>
            </div>
            <div>
              <p>2. ประสงค์จะเดินทางต่อไปยังสถานที่ใด (Next Destination)</p>
              <div className="ml-6 flex items-center gap-2 mt-2">
                <div className="w-4 h-4 border border-black"></div>
                <span>2.1 เดินทางกลับไปยังที่อยู่ปัจจุบันที่เป็นภูมิลำเนาข้างต้น</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-0 border-t-2 border-black mt-10">
            <div className="border-r border-black p-4 text-center space-y-4">
              <p className="font-bold underline uppercase">วัน เดือน ปี ที่เข้าพัก</p>
              <p className="text-xl font-bold py-2">{checkInDate ? new Date(checkInDate).toLocaleDateString('th-TH') : '-'}</p>
              <p className="border-t border-dotted border-black pt-2">เวลา (Time): 14:00 น.</p>
            </div>
            <div className="border-r border-black p-4 text-center space-y-4">
              <p className="font-bold underline uppercase">วัน เดือน ปี ที่ออกไป</p>
              <p className="text-xl font-bold py-2">{checkOutDate ? new Date(checkOutDate).toLocaleDateString('th-TH') : '-'}</p>
              <p className="border-t border-dotted border-black pt-2">เวลา (Time): 12:00 น.</p>
            </div>
            <div className="p-4 space-y-4">
              <p>ห้องพักเลขที่: <b>{roomNumber}</b></p>
              <div className="text-center pt-8">
                <p className="text-xs">ลายมือชื่อผู้พัก (Guest Signature)</p>
                <div className="mt-8 border-b border-black"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  // --- แบบฟอร์มใบเสร็จ / ใบกำกับภาษี ---
  const renderStandardInvoice = (title: string) => (
      <div className="p-[10mm] text-black">
        <div className="flex justify-between mb-8 border-b-4 border-slate-900 pb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">{resortInfo.resortName}</h1>
            <div className="text-sm text-slate-600 max-w-sm space-y-1">
              <p>{resortInfo.resortAddress}</p>
              <p><b>เลขผู้เสียภาษี:</b> {resortInfo.taxId}</p>
              <p><b>โทร:</b> {resortInfo.phone}</p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-between italic text-indigo-900 uppercase">
            <h2 className="text-3xl font-black">{title}</h2>
            <div>
              <p className="text-sm">No: RE-{(Date.now().toString().slice(-6))}</p>
              <p className="text-sm">Date: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-1">CUSTOMER / ผู้เข้าพัก</p>
            <h3 className="font-bold text-lg">{guest.title} {guest.firstNameTH} {guest.lastNameTH}</h3>
            <p className="text-xs text-slate-500 mt-1">{guest.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-slate-500">ห้องพัก:</div> <div className="font-bold">{roomNumber}</div>
            <div className="text-slate-500">เข้าพัก:</div> <div>{checkInDate}</div>
            <div className="text-slate-500">เลขบัตร:</div> <div>{guest.idNumber}</div>
          </div>
        </div>

        <table className="w-full mb-10">
          <thead className="bg-slate-900 text-white uppercase text-xs">
          <tr>
            <th className="py-4 px-4 text-left rounded-l-lg">Description</th>
            <th className="py-4 px-4 text-right">Unit Price</th>
            <th className="py-4 px-4 text-right rounded-r-lg">Total</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
          <tr className="text-sm">
            <td className="py-6 px-4">
              <p className="font-bold">{description}</p>
              <p className="text-xs text-slate-400 mt-1 italic font-normal text-[10pt]">Stay period: {checkInDate} to {checkOutDate}</p>
            </td>
            <td className="py-6 px-4 text-right">{amount.toLocaleString()}</td>
            <td className="py-6 px-4 text-right font-bold text-lg">{amount.toLocaleString()}</td>
          </tr>
          </tbody>
        </table>

        <div className="flex justify-end pt-4">
          <div className="w-80 space-y-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            {type === 'TAX_INVOICE' && (
                <>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>ยอดก่อนภาษี</span>
                    <span>{preVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 pb-2 border-b border-slate-50">
                    <span>ภาษีมูลค่าเพิ่ม 7%</span>
                    <span>{vat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </>
            )}
            <div className="flex justify-between text-xl font-black text-indigo-600">
              <span>NET TOTAL</span>
              <span>฿{amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-20">
          <div className="text-center pt-8 border-t-2 border-slate-900 border-dotted">
            <p className="font-bold">Authorized Signature</p>
          </div>
          <div className="text-center pt-8 border-t-2 border-slate-900 border-dotted">
            <p className="font-bold italic underline">Customer Signature</p>
          </div>
        </div>
      </div>
  );

  return (
      <div id="print-area" className="w-[210mm] bg-white text-black leading-normal shadow-lg mx-auto print:shadow-none font-serif">
        <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; }
          #print-area { margin: 0; border: none; width: 210mm; min-height: 297mm; padding: 10mm; }
          .no-print { display: none; }
        }
      `}</style>

        {type === 'RR3' ? renderRR3() : (
            renderStandardInvoice(type === 'RECEIPT' ? 'RECEIPT / ใบรับเงิน' : 'TAX INVOICE / ใบเสร็จรับเงิน')
        )}
      </div>
  );
};

export default PrintableDocument;