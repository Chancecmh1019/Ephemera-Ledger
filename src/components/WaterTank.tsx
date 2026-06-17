import { useMemo, useState, useEffect } from 'react';
import { RecordData } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { Activity } from 'lucide-react';

interface WaterTankProps {
  records: RecordData[];
  alertThreshold?: number;
  isRefreshing?: boolean;
}

export function WaterTank({ records, alertThreshold = 5000, isRefreshing = false }: WaterTankProps) {
  const cashBalance = useMemo(() => {
    console.log('WaterTank: 計算現金餘額');
    console.log('記錄總數:', records.length);
    
    const cashRecords = records.filter((r) => r.payment_method === 'cash');
    console.log('現金記錄數:', cashRecords.length);
    
    // 按照時間從舊到新排序（created_at 升序）
    const sortedRecords = [...cashRecords].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    console.log('最早的記錄:', sortedRecords[0]);
    console.log('最新的記錄:', sortedRecords[sortedRecords.length - 1]);
    
    const balance = sortedRecords.reduce((acc, r) => {
      const amount = Number(r.amount);
      // 收入增加餘額，支出減少餘額
      const newAcc = r.type === 'income' ? acc + amount : acc - amount;
      return newAcc;
    }, 0);
    
    console.log('最終現金餘額:', balance);
    return balance;
  }, [records]);

  // Max visual balance at 50,000 to scale the water level
  const fillPercentage = Math.min(Math.max((cashBalance / 50000) * 100, 5), 100);
  const isAlert = cashBalance < alertThreshold;

  const waterColor = isAlert 
    ? 'bg-[#d6adad] fill-[#d6adad]' // Theme Pink
    : 'bg-[#bccad6] fill-[#bccad6]'; // Theme Blue

  // Ripple state tracking to force animation restart
  const [rippleKey, setRippleKey] = useState(0);
  useEffect(() => {
    if (isRefreshing) {
      setRippleKey(prev => prev + 1);
    }
  }, [isRefreshing]);

  return (
    <div className={cn(
        "relative w-full flex-[1.5] min-h-[380px] lg:min-h-0 rounded-[40px] overflow-hidden bg-white/40 backdrop-blur-xl border transition-all duration-700 shadow-sm",
        isRefreshing ? "border-[#bccad6]/60 shadow-[0_0_40px_rgba(188,202,214,0.4)]" : "border-white/60"
    )}>
      {/* Background gradient from theme */}
      <div className="absolute bottom-0 left-0 w-full h-[75%] bg-gradient-to-t from-[#bccad6] to-[#cfd8d7] opacity-10 mix-blend-multiply"></div>
      
      {/* Ripple Wave Overlay when refreshing */}
      {isRefreshing && (
        <div key={`ripple-${rippleKey}`} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white/60 animate-ping opacity-60 z-10" style={{ animationDuration: '1.5s' }}></div>
      )}

      {/* Top status indicator for syncing */}
      <div className={cn("absolute top-6 right-6 z-30 transition-opacity duration-500 flex items-center gap-2", isRefreshing ? "opacity-60 text-[#bccad6]" : "opacity-0")}>
         <Activity className="w-3.5 h-3.5 animate-pulse" />
         <span className="text-[9px] uppercase tracking-widest font-sans">Syncing</span>
      </div>

      {/* Content container */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20 pointer-events-none text-[#4a4a4a]">
        <p className="text-[11px] uppercase tracking-[0.3em] opacity-40 mb-2 font-sans">Ephemera Tank</p>
        <p className="text-xs font-serif italic opacity-60 mb-1 tracking-widest">浮生儲水槽</p>
        <h2 className={cn("text-5xl lg:text-6xl font-serif mt-2 transition-colors duration-1000 tracking-tighter", isAlert ? "text-[#b08b8b]" : "text-[#4a4a4a]")}>
          {formatCurrency(cashBalance)}
        </h2>
        <div className="mt-6 z-20 bg-white/60 px-4 py-1.5 rounded-full border border-white/80 opacity-80 flex gap-4">
           <span className="text-[9px] uppercase tracking-widest font-sans">Level {Math.round(fillPercentage)}%</span>
           {isAlert && <span className="text-[9px] uppercase tracking-widest font-sans text-[#b08b8b]">枯竭警戒</span>}
        </div>
      </div>

      {/* SVG Wave layer */}
      <div 
        className="absolute bottom-0 left-0 right-0 w-full transition-all duration-1000 ease-out z-0" 
        style={{ height: `${fillPercentage}%` }}
      >
        <div className="absolute w-[200%] h-16 -top-14 left-0 animate-[wave_10s_linear_infinite]">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className={cn("w-full h-full transition-colors duration-1000", waterColor)}>
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" />
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5V0Z" opacity=".5" />
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" />
          </svg>
        </div>
        <div className={cn("absolute top-2 w-full h-[600px] transition-colors duration-1000", waterColor)} />
      </div>
    </div>
  );
}
