import { useState, useMemo } from 'react';
import { RecordData } from '../types';
import { formatCurrency, cn, safeParseDate } from '../lib/utils';
import { CreditCard, Banknote, Pen, Check, X, AlertCircle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface RecordListProps {
  records: RecordData[];
  onUpdate: (record: RecordData) => void;
}

export function RecordList({ records, onUpdate }: RecordListProps) {
  const [filter, setFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [editId, setEditId] = useState<string | null>(null);

  // Edit State
  const [editDesc, setEditDesc] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editMethod, setEditMethod] = useState<'cash'|'credit_card'>('cash');
  const [editType, setEditType] = useState<'income'|'expense'>('expense');

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filter === 'all') return true;
      if (filter === 'cash') return r.payment_method === 'cash';
      if (filter === 'credit') return r.payment_method === 'credit_card';
      return true;
    });
  }, [records, filter]);

  const startEdit = (r: RecordData) => {
    setEditId(r.id);
    // Remove default "未命名急件" placeholder when starting to edit
    setEditDesc(r.description === '未命名急件' ? '' : r.description);
    setEditNote(r.note || '');
    setEditAmount(r.amount);
    setEditMethod(r.payment_method);
    setEditType(r.type);
    
    const dateStr = format(safeParseDate(r.created_at), "yyyy-MM-dd'T'HH:mm");
    setEditDate(dateStr);
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = (r: RecordData) => {
    if (!editDesc || !editAmount || !editDate) return;
    
    const updated: RecordData = {
      ...r,
      description: editDesc,
      note: editNote,
      amount: Number(editAmount),
      payment_method: editMethod,
      type: editType,
      created_at: new Date(editDate).toISOString(),
      is_urgent: false // Clear urgent flag on save
    };
    onUpdate(updated);
    setEditId(null);
  };

  return (
    <div className="w-full flex-1 bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 flex flex-col overflow-hidden min-h-[500px] shadow-sm relative">
      <div className="p-6 md:px-8 border-b border-white/60 flex justify-between items-center bg-white/20 sticky top-0 z-20">
        <h3 className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-50 text-[#4a4a4a]">
          時光軸 · Timeline
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')} 
            className={cn("px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-colors shadow-sm", filter==='all' ? "bg-[#4a4a4a] text-[#f5f2ed]" : "bg-white/60 border border-white/80 text-[#4a4a4a] hover:bg-white")}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('cash')} 
            className={cn("px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-colors shadow-sm", filter==='cash' ? "bg-[#bccad6] text-[#4a4a4a]" : "bg-white/60 border border-white/80 text-[#4a4a4a] hover:bg-white")}
          >
            Cash
          </button>
          <button 
            onClick={() => setFilter('credit')} 
            className={cn("px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-colors shadow-sm", filter==='credit' ? "bg-[#d6adad] text-[#4a4a4a]" : "bg-white/60 border border-white/80 text-[#4a4a4a] hover:bg-white")}
          >
            Credit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
        {/* 增加左側 padding 以確保時間線點點有空間顯示 */}
        <div className="relative border-l-2 border-[#4a4a4a]/20 ml-8 md:ml-12 pb-12 flex flex-col gap-6">
          {/* 當處於編輯模式時，只顯示正在編輯的帳目 */}
          {editId ? (
            filtered.filter(r => r.id === editId).map((r) => (
              <div key={r.id} className="relative w-full">
                 <div className="absolute -left-[13px] top-6 w-6 h-6 rounded-full bg-white border-2 border-[#4a4a4a]/30 flex items-center justify-center z-10 shadow-md">
                    <Pen className="w-3 h-3 text-[#4a4a4a] opacity-50" />
                 </div>
                 <div className="bg-white/80 backdrop-blur-xl border border-[#4a4a4a]/20 p-5 rounded-2xl shadow-lg ml-6 relative z-10 flex flex-col gap-4">
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1 flex flex-col gap-1">
                         <label className="text-[9px] uppercase tracking-widest opacity-40">Date & Time</label>
                         <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="text-xs p-2.5 border border-[#4a4a4a]/20 rounded-xl bg-transparent focus:outline-none focus:border-[#4a4a4a] transition-colors" />
                       </div>
                       <div className="flex-[2] flex flex-col gap-1">
                         <label className="text-[9px] uppercase tracking-widest opacity-40">Description</label>
                         <input autoFocus type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="text-sm border-b border-[#4a4a4a]/20 p-2.5 bg-transparent focus:outline-none focus:border-[#4a4a4a] transition-colors placeholder:opacity-30" placeholder="補記帳目..."/>
                       </div>
                       <div className="flex-1 flex flex-col gap-1">
                         <label className="text-[9px] uppercase tracking-widest opacity-40">Amount</label>
                         <input type="number" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} className="text-sm border-b border-[#4a4a4a]/20 p-2.5 bg-transparent font-serif focus:outline-none focus:border-[#4a4a4a] transition-colors" />
                       </div>
                    </div>

                    {/* Note 欄位 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-widest opacity-40">Note / 備註</label>
                      <textarea 
                        value={editNote} 
                        onChange={e => setEditNote(e.target.value)} 
                        className="text-xs border border-[#4a4a4a]/20 p-2.5 rounded-xl bg-transparent focus:outline-none focus:border-[#4a4a4a] transition-colors placeholder:opacity-30 resize-none"
                        placeholder="額外備註資訊..."
                        rows={2}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
                       <div className="flex gap-2">
                         <button onClick={() => setEditMethod('cash')} className={cn("px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest flex items-center gap-1 border transition-colors", editMethod === 'cash' ? "bg-[#bccad6] border-transparent text-[#4a4a4a]" : "bg-transparent border-[#4a4a4a]/20 opacity-50")}><Banknote className="w-3 h-3"/> Cash</button>
                         <button onClick={() => setEditMethod('credit_card')} className={cn("px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest flex items-center gap-1 border transition-colors", editMethod === 'credit_card' ? "bg-[#d6adad] border-transparent text-[#4a4a4a]" : "bg-transparent border-[#4a4a4a]/20 opacity-50")}><CreditCard className="w-3 h-3"/> Credit</button>
                       </div>
                       
                       <div className="flex gap-2 w-full sm:w-auto">
                         <button onClick={cancelEdit} className="flex-1 sm:flex-none px-6 py-2 text-[10px] uppercase font-medium bg-[#4a4a4a]/5 hover:bg-[#4a4a4a]/10 text-[#4a4a4a] rounded-full transition-colors flex justify-center items-center gap-1"><X className="w-3 h-3"/> Cancel</button>
                         <button onClick={() => saveEdit(r)} className="flex-1 sm:flex-none px-6 py-2 text-[10px] uppercase font-medium bg-[#4a4a4a] text-[#f5f2ed] rounded-full hover:bg-[#333] shadow-md transition-all flex justify-center items-center gap-1"><Check className="w-3 h-3"/> Save</button>
                       </div>
                    </div>
                 </div>
              </div>
            ))
          ) : (
            /* 非編輯模式：顯示所有帳目 */
            filtered.map((r, i) => {
              // Render day separator logic
              let showDateHeader = false;
              if (i === 0) showDateHeader = true;
              else if (!isSameDay(safeParseDate(r.created_at), safeParseDate(filtered[i - 1].created_at))) {
                showDateHeader = true;
              }

              const isUrgent = r.is_urgent || (!r.is_urgent && r.description === '未命名急件');

            return (
              <div key={r.id} className="relative w-full group">
                {showDateHeader && <DateHeader date={r.created_at} />}
                
                {/* Timeline Dot */}
                <div className={cn(
                  "absolute -left-[9px] top-6 w-5 h-5 rounded-full border-[3px] border-[#f5f2ed] shadow-md z-10 transition-transform group-hover:scale-125",
                  r.payment_method === 'cash' ? "bg-[#bccad6]" : "bg-[#d6adad]"
                )}></div>
                
                {/* Card */}
                <div 
                  onClick={() => startEdit(r)}
                  className={cn(
                    "ml-6 p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex justify-between items-center relative overflow-hidden active:scale-[0.98]",
                    isUrgent ? "bg-white border-[#d6adad] shadow-[0_4px_20px_rgba(214,173,173,0.15)]" : "bg-white/40 border-white/80 hover:bg-white/80 hover:shadow-md"
                  )}
                >
                  {isUrgent && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#d6adad]/10 rounded-bl-full pointer-events-none" />
                  )}

                  <div className="flex flex-col gap-1 relative z-10 w-full pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-40 font-sans tracking-wider">
                        {format(safeParseDate(r.created_at), 'HH:mm')}
                      </span>
                      {isUrgent && (
                        <span className="bg-[#d6adad] text-white px-2 py-0.5 rounded text-[8px] uppercase tracking-widest flex items-center gap-1 shadow-sm animate-pulse">
                          <AlertCircle className="w-2.5 h-2.5" /> 待補齊
                        </span>
                      )}
                    </div>
                    
                    <h4 className={cn("font-serif text-sm md:text-base truncate", isUrgent ? "italic opacity-50" : "opacity-90")}>
                      {r.description}
                    </h4>
                    
                    {/* 顯示 note 如果有的話 */}
                    {r.note && r.note.trim() !== '' && (
                      <p className="text-[10px] opacity-50 text-[#4a4a4a] mt-0.5 line-clamp-1">
                        {r.note}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 relative z-10">
                     <span className={cn(
                       "font-serif text-lg",
                       r.type === 'income' ? "text-[#7a998b]" : isUrgent ? "text-[#b08b8b]" : "text-[#4a4a4a]"
                     )}>
                        {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                     </span>
                     <span className="text-[9px] opacity-40 uppercase tracking-widest flex items-center gap-1">
                       {r.payment_method === 'cash' ? <><Banknote className="w-3 h-3"/> Cash</> : <><CreditCard className="w-3 h-3"/> Card</>}
                     </span>
                  </div>

                  {/* Hover Edit Hint */}
                  <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white/90 to-transparent flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 pointer-events-none">
                     <Pen className="w-4 h-4 text-[#4a4a4a]/50" />
                  </div>
                </div>
              </div>
            );
            })
          )}
          {!editId && filtered.length === 0 && (
            <div className="ml-6 py-12 text-center">
               <p className="font-serif italic opacity-40 text-sm">水枯石爛，尚無痕跡...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DateHeader({ date }: { date: string }) {
  return (
    <div className="mt-6 mb-4 ml-6 flex items-center gap-4 z-10 w-fit">
       <div className="bg-[#4a4a4a] text-[#f5f2ed] px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-sans font-medium shadow-md">
         {format(safeParseDate(date), 'MMM d', { locale: zhTW })}
       </div>
       <div className="h-px flex-1 bg-[#4a4a4a]/10 max-w-[100px]"></div>
    </div>
  );
}
