import { useState } from 'react';
import { Banknote, CreditCard, CalendarDays, Check } from 'lucide-react';
import { cn } from '../lib/utils';

function getLocalCurrentTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
}

interface FluidSliderProps {
  onRecord: (amount: number, method: 'cash'|'credit_card', type: 'income'|'expense', desc: string, note: string, date?: string) => void;
}

export function FluidSlider({ onRecord }: FluidSliderProps) {
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(getLocalCurrentTime());
  const [manualDesc, setManualDesc] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualMethod, setManualMethod] = useState<'cash'|'credit_card'>('cash');
  const [manualType, setManualType] = useState<'income'|'expense'>('expense');

  const handleManualSubmit = () => {
    if (amount <= 0) return;
    let safeISODate: string | undefined = undefined;
    if (date) {
      try { safeISODate = new Date(date).toISOString(); } catch { safeISODate = new Date().toISOString(); }
    }

    onRecord(amount, manualMethod, manualType, manualDesc || '手動記帳', manualNote, safeISODate);
    
    // 重置表單
    setAmount(0);
    setDate(getLocalCurrentTime());
    setManualDesc('');
    setManualNote('');
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] relative flex flex-col items-center justify-center shadow-lg overflow-hidden p-8">
      
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-[#4a4a4a] font-serif italic text-sm tracking-widest opacity-80">Manual Entry</h2>
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-widest opacity-40 font-sans">手動記帳 / 精確填寫</p>
        </div>

        <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/60 hover:bg-white/60 transition-colors shadow-sm">
          <CalendarDays className="w-3.5 h-3.5 text-[#4a4a4a] opacity-70" />
          <input 
            type="datetime-local" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="text-[10px] bg-transparent outline-none text-[#4a4a4a] font-sans tracking-wider w-[120px] sm:w-[130px]"
          />
        </div>
      </div>

      {/* Manual Entry Form */}
      <div className="bg-white/80 backdrop-blur-2xl border border-white rounded-[32px] p-8 w-full max-w-[480px] shadow-xl z-20 flex flex-col gap-5 mt-8">
        <div className="flex flex-col gap-2">
           <label className="text-[10px] tracking-widest uppercase opacity-40 font-sans">金額 Amount</label>
           <input 
             type="number" 
             value={amount || ''}
             onChange={(e) => setAmount(Number(e.target.value))}
             className="bg-transparent text-5xl font-serif text-[#4a4a4a] outline-none border-b-2 border-[#4a4a4a]/20 pb-2 focus:border-[#4a4a4a] transition-colors"
             placeholder="0"
             autoFocus
           />
        </div>
        
        <div className="flex flex-col gap-2">
           <label className="text-[10px] tracking-widest uppercase opacity-40 font-sans">描述 Description</label>
           <input 
             type="text" 
             value={manualDesc}
             onChange={(e) => setManualDesc(e.target.value)}
             className="bg-transparent text-base font-sans text-[#4a4a4a] outline-none border-b border-[#4a4a4a]/20 pb-2 focus:border-[#4a4a4a] transition-colors"
             placeholder="買了些什麼..."
           />
        </div>
        
        <div className="flex flex-col gap-2">
           <label className="text-[10px] tracking-widest uppercase opacity-40 font-sans">備註 Note</label>
           <textarea 
             value={manualNote}
             onChange={(e) => setManualNote(e.target.value)}
             className="bg-transparent text-sm font-sans text-[#4a4a4a] outline-none border border-[#4a4a4a]/20 rounded-xl p-3 resize-none focus:border-[#4a4a4a] transition-colors"
             placeholder="額外備註資訊..."
             rows={3}
           />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-2">
          <button 
            onClick={() => setManualType('expense')} 
            className={cn(
              "py-3 rounded-xl text-sm tracking-widest border-2 transition-all font-medium", 
              manualType === 'expense' 
                ? "bg-[#4a4a4a] text-white border-[#4a4a4a] shadow-md" 
                : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20 hover:border-[#4a4a4a]/40"
            )}
          >
            支出
          </button>
          <button 
            onClick={() => setManualType('income')} 
            className={cn(
              "py-3 rounded-xl text-sm tracking-widest border-2 transition-all font-medium", 
              manualType === 'income' 
                ? "bg-[#4a4a4a] text-white border-[#4a4a4a] shadow-md" 
                : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20 hover:border-[#4a4a4a]/40"
            )}
          >
            收入
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setManualMethod('cash')} 
            className={cn(
              "py-3 rounded-xl text-xs uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 font-medium", 
              manualMethod === 'cash' 
                ? "bg-[#bccad6] text-[#4a4a4a] border-[#bccad6] shadow-md" 
                : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20 hover:border-[#4a4a4a]/40"
            )}
          >
            <Banknote className="w-4 h-4"/> Cash
          </button>
          <button 
            onClick={() => setManualMethod('credit_card')} 
            className={cn(
              "py-3 rounded-xl text-xs uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 font-medium", 
              manualMethod === 'credit_card' 
                ? "bg-[#d6adad] text-white border-[#d6adad] shadow-md" 
                : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20 hover:border-[#4a4a4a]/40"
            )}
          >
            <CreditCard className="w-4 h-4"/> Credit
          </button>
        </div>
        
        <button 
          onClick={handleManualSubmit}
          disabled={amount <= 0}
          className="mt-3 bg-[#4a4a4a] text-white py-4 rounded-full text-sm tracking-widest uppercase hover:bg-black transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg font-medium"
        >
          <Check className="w-5 h-5" /> 確認記錄
        </button>
      </div>
    </div>
  );
}
