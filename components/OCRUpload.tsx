
// components/OCRUpload.tsx handles the scanning of receipts and invoices using Gemini AI.
import React, { useState, useRef } from 'react';
import { processReceiptOCR } from '../services/geminiService';
import { Transaction, TransactionType, Category } from '../types';

interface OCRUploadProps {
  onTransactionDetected: (t: Omit<Transaction, 'id'>) => void;
  label?: string;
  subLabel?: string;
  intent?: 'INCOME' | 'EXPENSE' | 'GENERAL';
  colorClass?: string;
}

const OCRUpload: React.FC<OCRUploadProps> = ({ 
  onTransactionDetected, 
  label = "ถ่ายรูปสลิป / สแกน",
  subLabel = "AI Powered OCR & Cloud Storage",
  intent = "GENERAL",
  colorClass = "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'uploading'>('idle');
  const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProcessingCount({ current: 0, total: files.length });

    const fileList = Array.from(files) as File[];
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setProcessingCount(prev => ({ ...prev, current: i + 1 }));
      setStatus('scanning');

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64String = base64Data.split(',')[1];
        // Explicitly casting intent to avoid TS argument type error
        const result = await processReceiptOCR(base64String, intent as 'INCOME' | 'EXPENSE' | 'GENERAL');
        
        setStatus('uploading');
        await new Promise(r => setTimeout(r, 600));

        const validCategories = Object.values(Category);
        let mappedCategory = validCategories.find(c => c === result.category);
        
        if (!mappedCategory) {
          mappedCategory = result.type === TransactionType.INCOME 
            ? Category.OTHER_INCOME 
            : Category.SUPPLIES;
        }

        onTransactionDetected({
          date: result.date,
          amount: result.amount,
          type: result.type as TransactionType,
          category: mappedCategory as Category,
          description: result.description,
          isReconciled: false,
          imageUrl: base64Data
        });
        
        successCount++;
      } catch (err: any) {
        console.error(`Error:`, err);
        setError(`เกิดข้อผิดพลาด: ${err.message || 'ไม่ทราบสาเหตุ'}`);
      }
    }

    setIsProcessing(false);
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) setError(null);
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        accept="image/*" 
        multiple
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={`w-full py-5 px-6 rounded-[2rem] text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-xl active:scale-95 ${
          isProcessing 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
            : colorClass + " text-white"
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
               <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
               <span className="text-base text-slate-700">
                 {status === 'scanning' ? 'กำลังอ่านข้อมูล...' : 'กำลังสำรองข้อมูล...'}
               </span>
            </div>
            <span className="text-[10px] opacity-60 font-medium tracking-widest uppercase text-slate-500">
              Processing {processingCount.current} of {processingCount.total}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-lg font-black tracking-tight">{label}</span>
            </div>
            <span className="text-[10px] opacity-80 font-medium uppercase tracking-widest">
              {subLabel}
            </span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-rose-50 rounded-[1.5rem] border border-rose-100 flex items-center gap-3">
           <div className="bg-rose-100 text-rose-600 p-2 rounded-xl">⚠️</div>
           <p className="text-[11px] text-rose-600 font-bold leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
