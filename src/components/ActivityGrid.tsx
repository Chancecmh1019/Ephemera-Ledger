import { useMemo } from 'react';
import { RecordData } from '../types';
import { subDays, format, isSameDay } from 'date-fns';
import { cn, safeParseDate } from '../lib/utils';
import { Info } from 'lucide-react';

export function ActivityGrid({ records }: { records: RecordData[] }) {
  const GRID_DAYS = 28;

  const days = useMemo(() => {
    const end = new Date();
    const result = [];
    
    for (let i = GRID_DAYS - 1; i >= 0; i--) {
      const date = subDays(end, i);
      const dayRecords = records.filter(r => {
        try {
          const d = safeParseDate(r.created_at);
          if (isNaN(d.getTime())) return false;
          return isSameDay(d, date);
        } catch { return false; }
      });
      const count = dayRecords.length;
      
      let level = 0;
      if (count > 0) level = 1;
      if (count > 2) level = 2;
      if (count > 4) level = 3;
      
      result.push({ date, level, count });
    }
    
    return result;
  }, [records]);

  return (
    <div className="w-full flex-none bg-white/30 backdrop-blur-md rounded-[32px] p-6 lg:p-8 flex flex-col border border-white/60">
       <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-medium tracking-wide uppercase opacity-60 text-[#4a4a4a] flex items-center gap-1">光陰格子 · Footprints <Info className="w-3 h-3 opacity-40 ml-1" /></h3>
       </div>
       <div className="w-full overflow-x-auto pb-2">
          {/* We format as 7 rows x N columns, but since it's simple we can just flex wrap it, or do an actual grid.
              Let's do a simple flex wrap grid like github but horizontally flowing. */}
          <div className="flex gap-2 flex-wrap min-w-[200px]">
             {days.map((d, i) => (
                <div 
                  key={i} 
                  title={`${format(d.date, 'MM/dd')}: ${d.count} 筆留痕`}
                  className={cn(
                    "w-[16px] h-[16px] rounded-[4px] transition-all duration-300 hover:scale-110",
                    d.level === 0 && "bg-white/40 border border-white/40",
                    d.level === 1 && "bg-[#bccad6] opacity-40",
                    d.level === 2 && "bg-[#bccad6] opacity-70",
                    d.level === 3 && "bg-[#bccad6] opacity-100 shadow-[0_0_8px_rgba(188,202,214,0.6)]"
                  )}
                />
             ))}
          </div>
       </div>
       <div className="flex justify-between mt-4 text-[9px] opacity-40 text-[#4a4a4a] uppercase tracking-widest px-1">
         <span>{format(subDays(new Date(), GRID_DAYS - 1), 'MMM d')}</span>
         <span>{format(new Date(), 'MMM d')}</span>
       </div>
    </div>
  );
}
