import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, PanInfo, AnimatePresence } from 'motion/react';
import { Banknote, CreditCard, CalendarDays, Edit3, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

function getLocalCurrentTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
}

interface FluidSliderProps {
  onRecord: (amount: number, method: 'cash'|'credit_card', type: 'income'|'expense', desc: string, note: string, date?: string) => void;
}

export function FluidSlider({ onRecord }: FluidSliderProps) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<string>(getLocalCurrentTime());
  const [isDragging, setIsDragging] = useState(false);
  
  // Directions: 0 = neutral, -1 = left (cash), 1 = right (credit)
  const [actionDir, setActionDir] = useState<0 | -1 | 1>(0);

  // Manual Mode State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualDesc, setManualDesc] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualMethod, setManualMethod] = useState<'cash'|'credit_card'>('cash');
  const [manualType, setManualType] = useState<'income'|'expense'>('expense');

  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleDrag = (_: any, info: PanInfo) => {
    if (isManualMode) return;
    setIsDragging(true);
    
    // Vertical for amount (up = increase)
    const deltaY = -info.delta.y; 
    if (Math.abs(deltaY) > 0) {
      // faster drag = bigger increment
      const multiplier = Math.max(1, Math.abs(info.velocity.y) / 500);
      let step = 1;
      if (Math.abs(info.velocity.y) > 800) step = 100;
      else if (Math.abs(info.velocity.y) > 300) step = 10;
      else if (amount >= 1000) step = 50;
      else if (amount >= 100) step = 10;
      else if (amount >= 50) step = 5;

      const increase = Math.sign(deltaY) * step * Math.ceil(multiplier);
      setAmount(prev => Math.max(0, prev + increase));
      
      if (Math.max(0, amount + increase) !== amount && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }

    // Horizontal for mode
    if (info.offset.x < -80) {
      setActionDir(-1);
    } else if (info.offset.x > 80) {
      setActionDir(1);
    } else {
      setActionDir(0);
    }
  };

  const handleDragEnd = () => {
    if (isManualMode) return;
    setIsDragging(false);
    
    if (actionDir !== 0 && amount > 0) {
      const method = actionDir === -1 ? 'cash' : 'credit_card';
      
      let safeISODate: string | undefined = undefined;
      if (date) {
        try { safeISODate = new Date(date).toISOString(); } catch { safeISODate = new Date().toISOString(); }
      }

      onRecord(amount, method, 'expense', '未命名急件', '', safeISODate);
      
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      
      setAmount(0);
      setDate(getLocalCurrentTime());
    }
    setActionDir(0);
  };

  const handleManualSubmit = () => {
    if (amount <= 0) return;
    let safeISODate: string | undefined = undefined;
    if (date) {
      try { safeISODate = new Date(date).toISOString(); } catch { safeISODate = new Date().toISOString(); }
    }

    onRecord(amount, manualMethod, manualType, manualDesc || '精確記帳', manualNote, safeISODate);
    setIsManualMode(false);
    setAmount(0);
    setDate(getLocalCurrentTime());
    setManualDesc('');
    setManualNote('');
  };

  return (
    <div className="w-full h-[280px] sm:h-[320px] lg:h-full min-h-[300px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] relative flex flex-col items-center justify-center shadow-lg group overflow-hidden">
      
      {/* Background active indicators based on actionDir */}
      <div className={cn("absolute inset-0 bg-[#bccad6]/20 transition-opacity duration-500", actionDir === -1 && !isManualMode ? "opacity-100" : "opacity-0")} />
      <div className={cn("absolute inset-0 bg-[#d6adad]/20 transition-opacity duration-500", actionDir === 1 && !isManualMode ? "opacity-100" : "opacity-0")} />

      {/* Top Bar Navigation */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <h2 className="text-[#4a4a4a] font-serif italic text-sm tracking-widest opacity-80">Fluid Moment</h2>
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-widest opacity-40 font-sans">流體瞬記法 / 精確手填</p>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/60 hover:bg-white/60 transition-colors shadow-sm">
          <CalendarDays className="w-3.5 h-3.5 text-[#4a4a4a] opacity-70" />
          <input 
            type="datetime-local" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="text-[10px] bg-transparent outline-none text-[#4a4a4a] font-sans tracking-wider w-[120px] sm:w-[130px]"
          />
        </div>
      </div>

      {/* Side indicators (hidden in manual mode) */}
      <AnimatePresence>
        {!isManualMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none z-0"
          >
            <div className={cn("flex flex-col items-center gap-2 transition-all duration-300", actionDir === -1 ? "scale-110 opacity-100 text-[#7a90a3]" : "opacity-30 text-[#4a4a4a]")}>
              <Banknote className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-[10px] tracking-widest uppercase font-medium">Cash</span>
            </div>
            <div className={cn("flex flex-col items-center gap-2 transition-all duration-300", actionDir === 1 ? "scale-110 opacity-100 text-[#b08b8b]" : "opacity-30 text-[#4a4a4a]")}>
              <CreditCard className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-[10px] tracking-widest uppercase font-medium">Credit</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 w-full px-6 flex justify-between items-center z-10 pointer-events-none">
        <span className="text-[9px] uppercase tracking-widest text-[#4a4a4a] opacity-30 leading-relaxed max-w-[200px]">
          {isManualMode ? "請輸入精確資訊" : (isDragging ? (actionDir === -1 ? "← 收斂至現金" : actionDir === 1 ? "收斂至信用卡 →" : "拖曳調額/選擇") : "拖曳冠鈕或切換手動")}
        </span>
        
        {/* Toggle Manual Mode Button */}
        <button 
          onClick={() => setIsManualMode(!isManualMode)} 
          className="pointer-events-auto bg-white/50 border border-white/60 p-2 rounded-full shadow-sm hover:scale-110 transition-transform text-[#4a4a4a]"
        >
          {isManualMode ? <X className="w-4 h-4 opacity-70" /> : <Edit3 className="w-4 h-4 opacity-70" />}
        </button>
      </div>

      {/* Center Action Area */}
      {isManualMode ? (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white/80 backdrop-blur-2xl border border-white rounded-[32px] p-6 w-[85%] max-w-[320px] shadow-xl z-20 flex flex-col gap-4 mt-6"
        >
          <div className="flex flex-col gap-1">
             <label className="text-[10px] tracking-widest uppercase opacity-40 font-sans">Amount</label>
             <input 
               type="number" 
               value={amount || ''}
               onChange={(e) => setAmount(Number(e.target.value))}
               className="bg-transparent text-4xl font-serif text-[#4a4a4a] outline-none border-b border-[#4a4a4a]/10 pb-1"
               placeholder="0"
               autoFocus
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] tracking-widest uppercase opacity-40 font-sans">Description (Optional)</label>
             <input 
               type="text" 
               value={manualDesc}
               onChange={(e) => setManualDesc(e.target.value)}
               className="bg-transparent text-sm font-sans text-[#4a4a4a] outline-none border-b border-[#4a4a4a]/10 pb-1"
               placeholder="買了些什麼..."
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] tracking-widest uppercase opacity-40 font-sans">Note (Optional)</label>
             <textarea 
               value={manualNote}
               onChange={(e) => setManualNote(e.target.value)}
               className="bg-transparent text-xs font-sans text-[#4a4a4a] outline-none border border-[#4a4a4a]/10 rounded-lg p-2 resize-none"
               placeholder="額外備註..."
               rows={2}
             />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={() => setManualType('expense')} className={cn("py-2 rounded-xl text-xs tracking-widest border transition-all", manualType === 'expense' ? "bg-[#4a4a4a] text-white border-[#4a4a4a]" : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20")}>支出</button>
            <button onClick={() => setManualType('income')} className={cn("py-2 rounded-xl text-xs tracking-widest border transition-all", manualType === 'income' ? "bg-[#4a4a4a] text-white border-[#4a4a4a]" : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20")}>收入</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setManualMethod('cash')} className={cn("py-2 rounded-xl text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5", manualMethod === 'cash' ? "bg-[#bccad6] text-[#4a4a4a] border-[#bccad6]" : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20")}><Banknote className="w-3.5 h-3.5"/> Cash</button>
            <button onClick={() => setManualMethod('credit_card')} className={cn("py-2 rounded-xl text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5", manualMethod === 'credit_card' ? "bg-[#d6adad] text-white border-[#d6adad]" : "bg-transparent text-[#4a4a4a] border-[#4a4a4a]/20")}><CreditCard className="w-3.5 h-3.5"/> Credit</button>
          </div>
          <button 
            onClick={handleManualSubmit}
            disabled={amount <= 0}
            className="mt-2 bg-[#4a4a4a] text-white py-3 rounded-full text-xs tracking-widest uppercase hover:bg-black transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-md"
          >
            <Check className="w-4 h-4" /> 確認紀錄
          </button>
        </motion.div>
      ) : (
        <motion.div
          ref={containerRef}
          drag
          dragElastic={0.1}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{ x: 0, y: 0, scale: isDragging ? 1.05 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          whileTap={{ cursor: 'grabbing' }}
          className="w-48 h-48 rounded-full bg-white/60 backdrop-blur-2xl border border-white shadow-[0_10px_40px_rgba(0,0,0,0.05)] cursor-grab flex flex-col items-center justify-center relative z-20"
        >
          <span className="text-[11px] font-sans tracking-widest opacity-40 uppercase absolute top-8">Amount</span>
          
          <input 
             type="number"
             value={amount === 0 ? '' : amount}
             onChange={(e) => setAmount(Number(e.target.value))}
             placeholder="0"
             className={cn("bg-transparent outline-none text-center font-serif text-5xl sm:text-6xl tracking-tighter transition-colors duration-300 w-full px-4", 
                amount === 0 ? "text-[#4a4a4a]/40" : 
                actionDir === -1 ? "text-[#7a90a3]" : 
                actionDir === 1 ? "text-[#b08b8b]" : "text-[#4a4a4a]"
             )}
          />
          
          {/* Subtle decorative grooves for the "digital crown" feel */}
          <div className="absolute inset-2 rounded-full border border-[#4a4a4a]/5 border-dashed pointer-events-none animate-[spin_60s_linear_infinite]" />
        </motion.div>
      )}
    </div>
  );
}
