import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'motion/react';
import { Banknote, CreditCard, CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface FluidSliderProps {
  onRecord: (amount: number, method: 'cash'|'credit_card', type: 'income'|'expense', desc: string, date?: string) => void;
}

export function FluidSlider({ onRecord }: FluidSliderProps) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<string>(''); // empty = now
  const [isDragging, setIsDragging] = useState(false);
  
  // Directions: 0 = neutral, -1 = left (cash), 1 = right (credit)
  const [actionDir, setActionDir] = useState<0 | -1 | 1>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleDrag = (_: any, info: PanInfo) => {
    setIsDragging(true);
    
    // Vertical for amount (up = increase)
    const deltaY = -info.delta.y; 
    if (Math.abs(deltaY) > 0) {
      // faster drag = bigger increment
      const multiplier = Math.max(1, Math.abs(info.velocity.y) / 500);
      const step = Math.abs(info.velocity.y) > 800 ? 100 : 10;
      const increase = Math.sign(deltaY) * step * Math.ceil(multiplier);
      setAmount(prev => Math.max(0, prev + increase));
      
      // small haptic feedback if browser supports
      if (Math.max(0, amount + increase) !== amount && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }

    // Horizontal for mode (left = cash, right = credit)
    if (info.offset.x < -80) {
      setActionDir(-1);
    } else if (info.offset.x > 80) {
      setActionDir(1);
    } else {
      setActionDir(0);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    if (actionDir !== 0 && amount > 0) {
      // Commit
      const method = actionDir === -1 ? 'cash' : 'credit_card';
      // Default to expense, title is "未命名急件"
      onRecord(amount, method, 'expense', '未命名急件', date ? new Date(date).toISOString() : undefined);
      
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // success haptic
      
      // Reset
      setAmount(0);
      setDate('');
    }
    setActionDir(0);
  };

  return (
    <div className="w-full h-[280px] sm:h-[320px] lg:h-full min-h-[300px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] relative overflow-hidden flex flex-col items-center justify-center shadow-lg group">
      
      {/* Background active indicators based on actionDir */}
      <div className={cn("absolute inset-0 bg-[#bccad6]/20 transition-opacity duration-500", actionDir === -1 ? "opacity-100" : "opacity-0")} />
      <div className={cn("absolute inset-0 bg-[#d6adad]/20 transition-opacity duration-500", actionDir === 1 ? "opacity-100" : "opacity-0")} />

      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <h2 className="text-[#4a4a4a] font-serif italic text-sm tracking-widest opacity-80">Fluid Moment</h2>
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-widest opacity-40 font-sans">流體瞬記法</p>
        </div>

        {/* Date Picker (pointer-events-auto so it can be clicked) */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/60 hover:bg-white/60 transition-colors">
          <CalendarDays className="w-3.5 h-3.5 text-[#4a4a4a] opacity-70" />
          <input 
            type="datetime-local" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="text-[10px] bg-transparent outline-none text-[#4a4a4a] font-sans tracking-wider w-[120px] sm:w-[130px]"
          />
        </div>
      </div>

      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none z-0">
        <div className={cn("flex flex-col items-center gap-2 transition-all duration-300", actionDir === -1 ? "scale-110 opacity-100 text-[#7a90a3]" : "opacity-30 text-[#4a4a4a]")}>
          <Banknote className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase font-medium">Cash</span>
        </div>
        <div className={cn("flex flex-col items-center gap-2 transition-all duration-300", actionDir === 1 ? "scale-110 opacity-100 text-[#b08b8b]" : "opacity-30 text-[#4a4a4a]")}>
          <CreditCard className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase font-medium">Credit</span>
        </div>
      </div>

      <div className="absolute bottom-6 w-full text-center pointer-events-none text-[9px] uppercase tracking-widest text-[#4a4a4a] opacity-30 px-6 leading-relaxed">
        {isDragging 
          ? (actionDir === -1 ? "← 放開以現金結帳" : actionDir === 1 ? "放開以信用卡帳 →" : "上下滑動調額  /  左右滑動付款") 
          : "按住此處上下滑動調額 · 左右決定付款"}
      </div>

      {/* The Draggable Crown Element */}
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
        <div className={cn("font-serif text-5xl sm:text-6xl tracking-tighter transition-colors duration-300", 
            amount === 0 ? "text-[#4a4a4a]/40" : 
            actionDir === -1 ? "text-[#7a90a3]" : 
            actionDir === 1 ? "text-[#b08b8b]" : "text-[#4a4a4a]"
        )}>
          {amount}
        </div>
        
        {/* Subtle decorative grooves for the "digital crown" feel */}
        <div className="absolute inset-2 rounded-full border border-[#4a4a4a]/5 border-dashed pointer-events-none animate-[spin_60s_linear_infinite]" />
      </motion.div>
    </div>
  );
}
