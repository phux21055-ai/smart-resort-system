
import React, { useState } from 'react';
import { TransactionType, Category, Transaction } from '../types';

interface ManualEntryProps {
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onAdd, onClose }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<Category>(Category.SUPPLIES);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const incomeCategories = [
    Category.ROOM_REVENUE, 
    Category.FOOD_BEVERAGE, 
    Category.SPA_SERVICE, 
    Category.OTHER_INCOME
  ];

  const expenseCategories = [
    Category.UTILITIES, 
    Category.STAFF_SALARY, 
    Category.MARKETING, 
    Category.MAINTENANCE, 
    Category.SUPPLIES, 
    Category.TAX_FEE,
    Category.SOFTWARE_SUBSCRIPTION,
    Category.OFFICE_SUPPLIES,
    Category.CLEANING_SUPPLIES
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    onAdd({
      date,
      type,
      category,
      amount: parseFloat(amount),
      description,
      isReconciled: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">บันทึกรายการใหม่</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">ปิด</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button 
                type="button"
                onClick={() => { setType(TransactionType.INCOME); setCategory(Category.ROOM_REVENUE); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${type === TransactionType.INCOME ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                รายรับ
              </button>
              <button 
                type="button"
                onClick={() => { setType(TransactionType.EXPENSE); setCategory(Category.SUPPLIES); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${type === TransactionType.EXPENSE ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}
              >
                รายจ่าย
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">วันที่</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">จำนวนเงิน (฿)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">หมวดหมู่</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                {(type === TransactionType.INCOME ? incomeCategories : expenseCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">รายละเอียด</label>
              <input 
                type="text" 
                placeholder="เช่น ซื้อน้ำยาถูพื้น, ค่าสมัครสมาชิก Canva..."
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button 
              type="submit"
              className={`w-full py-5 rounded-3xl text-sm font-black text-white shadow-xl transition-all active:scale-95 mt-4 ${type === TransactionType.INCOME ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-500 shadow-rose-100'}`}
            >
              บันทึกรายการ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualEntry;
