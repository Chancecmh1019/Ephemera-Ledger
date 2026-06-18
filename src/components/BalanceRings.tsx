import { useMemo } from 'react';
import { RecordData } from '../types';
import { formatCurrency } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function BalanceRings({ records }: { records: RecordData[] }) {
  const data = useMemo(() => {
    let income = 0;
    let expenseCash = 0;
    let expenseCredit = 0;

    records.forEach(r => {
      if (r.type === 'income') income += r.amount;
      else if (r.payment_method === 'cash') expenseCash += r.amount;
      else if (r.payment_method === 'credit_card') expenseCredit += r.amount;
    });
    
    const cashRemaining = Math.max(income - expenseCash, 0);
    return [
      { name: '現金餘額', value: cashRemaining, color: '#bccad6' }, // Blue - index 0
      { name: '現金支出', value: expenseCash, color: 'rgba(188, 202, 214, 0.2)' }, // index 1
      { name: '信用支出', value: expenseCredit, color: '#d6adad' }, // Pink - index 2
      { name: '未用信用', value: Math.max(20000 - expenseCredit, 0), color: 'rgba(214, 173, 173, 0.2)' } // index 3
    ];
  }, [records]);

  // Cash ring: 現金餘額 + 現金支出
  const cashData = [data[0], data[1]];
  // Credit ring: 信用支出 + 未用信用
  const creditData = [data[2], data[3]];

  return (
    <div className="w-full flex-1 min-h-[160px] bg-white/30 backdrop-blur-md rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between border border-white/60 overflow-hidden shadow-sm">
      <div className="flex-1 w-full text-center md:text-left mb-4 md:mb-0">
        <h3 className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-50 text-[#4a4a4a] mb-1">餘額對稱儀 · Balance</h3>
        <p className="text-2xl font-serif text-[#4a4a4a]">{formatCurrency(data[0].value)}</p>
      </div>
      
      <div className="flex gap-4 items-center">
        {/* Cash Ring */}
        <div className="w-[80px] h-[80px] relative flex flex-col items-center justify-center">
          <div className="absolute inset-0">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={cashData} cx="50%" cy="50%" innerRadius={28} outerRadius={36} dataKey="value" stroke="none" paddingAngle={2}>
                   {cashData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-[#4a4a4a] opacity-60">Cash</span>
        </div>

        {/* Credit Ring */}
        <div className="w-[80px] h-[80px] relative flex flex-col items-center justify-center">
          <div className="absolute inset-0">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={creditData} cx="50%" cy="50%" innerRadius={28} outerRadius={36} dataKey="value" stroke="none" paddingAngle={2}>
                   {creditData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-[#4a4a4a] opacity-60">Card</span>
        </div>
      </div>
    </div>
  );
}
