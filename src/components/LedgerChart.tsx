import { useMemo } from 'react';
import { RecordData } from '../types';
import { format } from 'date-fns';
import { safeParseDate } from '../lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function LedgerChart({ records }: { records: RecordData[] }) {
  const chartData = useMemo(() => {
    // Generate daily summary for the last 30 days
    const dataMap = new Map<string, { date: string, cashOut: number, creditOut: number, income: number, expense: number }>();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = format(d, 'MM/dd');
      dataMap.set(str, { date: str, cashOut: 0, creditOut: 0, income: 0, expense: 0 });
    }

    records.forEach(r => {
      try {
        const d = safeParseDate(r.created_at);
        if (isNaN(d.getTime())) return;
        const dStr = format(d, 'MM/dd');
        if (dataMap.has(dStr)) {
          const entry = dataMap.get(dStr)!;
          if (r.type === 'expense') {
            entry.expense += r.amount;
            if (r.payment_method === 'cash') entry.cashOut += r.amount;
            if (r.payment_method === 'credit_card') entry.creditOut += r.amount;
          } else if (r.type === 'income') {
            entry.income += r.amount;
          }
        }
      } catch {}
    });

    return Array.from(dataMap.values());
  }, [records]);

  const stats = useMemo(() => {
    return records.reduce((acc, r) => {
      if (r.type === 'income') acc.income += r.amount;
      if (r.type === 'expense') {
        acc.expense += r.amount;
        if (r.payment_method === 'cash') acc.cash += r.amount;
        if (r.payment_method === 'credit_card') acc.credit += r.amount;
      }
      return acc;
    }, { income: 0, expense: 0, cash: 0, credit: 0 });
  }, [records]);

  return (
    <div className="w-full flex-1 min-h-[350px] lg:min-h-0 h-full bg-white/40 backdrop-blur-md rounded-[32px] p-6 lg:p-8 flex flex-col border border-white/60 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-50 text-[#4a4a4a]">歲月流線 · Trend Analysis</h3>
        
        <div className="flex flex-wrap gap-4 text-[10px] tracking-widest font-sans opacity-80">
          <div className="flex flex-col">
             <span className="opacity-50 text-[9px] uppercase">Total Income</span>
             <span className="font-mono text-green-700/80">${stats.income.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
             <span className="opacity-50 text-[9px] uppercase">Cash Out</span>
             <span className="font-mono text-[#7a90a3]">${stats.cash.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
             <span className="opacity-50 text-[9px] uppercase">Credit Out</span>
             <span className="font-mono text-[#b08b8b]">${stats.credit.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
             <span className="opacity-50 text-[9px] uppercase">Net Flow</span>
             <span className="font-mono text-[#4a4a4a] text-sm">${(stats.income - stats.expense).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[220px] -ml-4">
        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a3c9a8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#a3c9a8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d6adad" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#d6adad" stopOpacity={0}/>
              </linearGradient>
            </defs>
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
               itemStyle={{ padding: '2px 0' }}
            />
            <Area type="monotone" dataKey="income" name="收入" stroke="#a3c9a8" fillOpacity={1} fill="url(#colorIncome)" />
            <Area type="monotone" dataKey="expense" name="總支出" stroke="#d6adad" fillOpacity={1} fill="url(#colorExpense)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
