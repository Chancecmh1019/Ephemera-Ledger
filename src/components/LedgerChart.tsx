import { useMemo } from 'react';
import { RecordData } from '../types';
import { format, parseISO, startOfMonth, formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function LedgerChart({ records }: { records: RecordData[] }) {
  const chartData = useMemo(() => {
    // Generate daily summary for the last 30 days
    const dataMap = new Map<string, { date: string, cashOut: number, creditOut: number }>();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = format(d, 'MM/dd');
      dataMap.set(str, { date: str, cashOut: 0, creditOut: 0 });
    }

    records.forEach(r => {
      try {
        const d = parseISO(r.created_at);
        if (isNaN(d.getTime())) return;
        const dStr = format(d, 'MM/dd');
        if (dataMap.has(dStr) && r.type === 'expense') {
          const entry = dataMap.get(dStr)!;
          if (r.payment_method === 'cash') entry.cashOut += r.amount;
          if (r.payment_method === 'credit_card') entry.creditOut += r.amount;
        }
      } catch {}
    });

    return Array.from(dataMap.values());
  }, [records]);

  return (
    <div className="w-full flex-1 min-h-[300px] h-full bg-white/40 backdrop-blur-md rounded-[32px] p-6 lg:p-8 flex flex-col border border-white/60 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-50 text-[#4a4a4a]">歲月流線 · Trend</h3>
        <div className="flex gap-4 text-[9px] uppercase tracking-widest font-sans opacity-70">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#bccad6]" /> 現金流出</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#d6adad]" /> 信用流出</div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(74, 74, 74, 0.05)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#4a4a4a', opacity: 0.4 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#4a4a4a', opacity: 0.4 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip 
               contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontSize: '11px', fontFamily: 'sans-serif' }}
               itemStyle={{ color: '#4a4a4a', padding: '2px 0' }}
            />
            <Line type="monotone" dataKey="cashOut" name="現金" stroke="#bccad6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#bccad6', stroke: '#fff', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="creditOut" name="信用卡" stroke="#d6adad" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#d6adad', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
