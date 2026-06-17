import { useState, useEffect, useCallback } from 'react';
import { RecordData, User } from './types';
import { WaterTank } from './components/WaterTank';
import { LedgerChart } from './components/LedgerChart';
import { FluidSlider } from './components/FluidSlider';
import { RecordList } from './components/RecordList';
import { BalanceRings } from './components/BalanceRings';
import { ActivityGrid } from './components/ActivityGrid';
import { Leaf, Loader2, Clock, Plus, BarChart } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { cn } from './lib/utils';

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  if (clientId) {
    return (
      <GoogleOAuthProvider clientId={clientId}>
        <BrowserRouter>
          <MainApp />
        </BrowserRouter>
      </GoogleOAuthProvider>
    );
  }

  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

function MainApp() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ephemera_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecords = useCallback(async (userId: string, background = false) => {
    if (!background) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await fetch(`/api/records?user_id=${userId}`);
      if (!res.ok) {
        // Fallback to localStorage for static deployments (Vercel)
        const localData = localStorage.getItem(`ephemera_records_${userId}`);
        if (localData) {
           const parsed = JSON.parse(localData);
           // 確保 amount 是數字類型
           const normalized = parsed.map((r: any) => ({
             ...r,
             amount: Number(r.amount)
           }));
           setRecords(normalized);
        }
        return;
      }
      const data = await res.json();
      // 確保 amount 是數字類型
      const normalized = data.map((r: any) => ({
        ...r,
        amount: Number(r.amount)
      }));
      setRecords(normalized);
      localStorage.setItem(`ephemera_records_${userId}`, JSON.stringify(normalized));
    } catch (e) {
      console.error(e);
      // Fallback
      const localData = localStorage.getItem(`ephemera_records_${userId}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        // 確保 amount 是數字類型
        const normalized = parsed.map((r: any) => ({
          ...r,
          amount: Number(r.amount)
        }));
        setRecords(normalized);
      }
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 800);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecords(user.id);

      const focusHandler = () => {
        console.log("Window focused, refreshing data...");
        fetchRecords(user.id, true);
      };
      window.addEventListener('focus', focusHandler);
      
      const interval = setInterval(() => {
        fetchRecords(user.id, true);
      }, 60000);

      return () => {
        window.removeEventListener('focus', focusHandler);
        clearInterval(interval);
      };
    } else {
      setRecords([]);
      setLoading(false);
    }
  }, [user, fetchRecords]);

  const handleRecord = async (amount: number, paymentMethod: 'cash'|'credit_card', type: 'income'|'expense', description: string, note: string, customDate?: string) => {
    if (!user) return;
    
    console.log('handleRecord 被調用:', { amount, paymentMethod, type, description, note, customDate });
    console.log('amount 的型別:', typeof amount);
    
    setIsRefreshing(true);
    const newRecord: RecordData = {
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: Number(amount), // 確保是數字
      payment_method: paymentMethod,
      type,
      description,
      note: note || '',
      created_at: customDate || new Date().toISOString(),
      is_urgent: description === '未命名急件'
    };
    
    console.log('新記錄:', newRecord);
    
    // 先更新本地狀態，提供即時反饋
    setRecords(prev => {
        console.log('更新前的記錄數量:', prev.length);
        const arr = [newRecord, ...prev];
        const sorted = arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        console.log('更新後的記錄數量:', sorted.length);
        localStorage.setItem(`ephemera_records_${user.id}`, JSON.stringify(sorted));
        return sorted;
    });

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      
      if (res.ok) {
        console.log('記錄已成功儲存到雲端');
        fetchRecords(user.id, true);
      } else {
        const errorText = await res.text();
        console.error('儲存到雲端失敗:', errorText);
      }
    } catch (e) {
      console.error("無法連線到伺服器，僅儲存到本地端", e);
    }
  };

  const handleUpdate = async (updatedRecord: RecordData) => {
    if (!user) return;
    setIsRefreshing(true);
    
    // 確保 amount 是數字類型
    const normalizedRecord = {
      ...updatedRecord,
      amount: Number(updatedRecord.amount)
    };
    
    setRecords(prev => {
        const arr = prev.map(r => r.id === normalizedRecord.id ? normalizedRecord : r);
        const sorted = arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        localStorage.setItem(`ephemera_records_${user.id}`, JSON.stringify(sorted));
        return sorted;
    });
    
    try {
      const res = await fetch(`/api/records/${normalizedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedRecord)
      });
      if (res.ok) fetchRecords(user.id, true);
    } catch (e) {
      console.error("Update to cloud failed", e);
    }
  };

  const handleLoginSuccess = async (tokenResponse: any) => {
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      
      const userObj: User = { 
        id: `google-${userInfo.sub}`, 
        name: userInfo.name || '時光旅人',
        email: userInfo.email,
        picture: userInfo.picture
      };
      
      setUser(userObj);
      localStorage.setItem('ephemera_user', JSON.stringify(userObj));
    } catch (e) {
      console.error("Login verification failed", e);
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: () => console.error('Login Failed'),
  });

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ephemera_user');
  };

  if (loading && !records.length && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] text-[#4a4a4a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin opacity-50" />
          <p className="text-xs font-serif tracking-widest opacity-60">聯結流淌的時光...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-[#f5f2ed] relative overflow-hidden">
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/50 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg border border-white/60 mb-6 sm:mb-8 relative z-10 transition-transform hover:scale-105">
          <Leaf className="w-10 h-10 sm:w-12 sm:h-12 text-[#bccad6]" strokeWidth={1} />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-widest text-[#4a4a4a] mb-2 sm:mb-3 relative z-10">浮生誌</h1>
        <p className="text-xs sm:text-sm text-[#4a4a4a] opacity-50 tracking-widest mb-10 sm:mb-16 relative z-10 font-serif">歲月留痕 · Ephemera Ledger</p>
        
        <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-[280px] sm:max-w-[320px]">
          <button 
            onClick={() => login()}
            className="w-full bg-white/60 backdrop-blur-md text-[#4a4a4a] border border-[#bccad6]/50 px-6 py-3.5 sm:px-10 sm:py-4 rounded-full text-[11px] sm:text-xs tracking-widest font-sans flex items-center justify-center gap-3 hover:bg-white/90 hover:shadow-lg transition-all duration-300"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 sm:w-5 sm:h-5" />
            以 Google 登入開始留痕
          </button>
          
          <p className="text-[9px] sm:text-[10px] text-[#4a4a4a] opacity-40 font-sans tracking-wide leading-relaxed">
            ※ 若點擊無反應，可能是您的瀏覽器阻擋了彈窗。<br/>請複製網址並使用 Safari 或 Chrome 重新開啟。
          </p>
        </div>
        
        <div className="absolute top-[10%] left-[-20%] sm:left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#bccad6] rounded-full blur-[80px] sm:blur-[120px] opacity-40 pointer-events-none"></div>
        <div className="absolute bottom-[5%] right-[-20%] sm:right-[-10%] w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-[#d6adad] rounded-full blur-[80px] sm:blur-[120px] opacity-30 pointer-events-none"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pb-32 pt-8 px-4 sm:px-6 lg:p-8 relative overflow-x-hidden flex flex-col bg-[#f5f2ed] text-[#4a4a4a] font-sans selection:bg-[#bccad6]/30">
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#bccad6] rounded-full blur-[120px] opacity-30 pointer-events-none transition-all duration-1000"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#d6adad] rounded-full blur-[120px] opacity-20 pointer-events-none transition-all duration-1000"></div>

      <div className="w-full max-w-[1400px] mx-auto flex flex-col h-full relative z-10">
        <div className="w-full flex justify-between items-center mb-8 px-2 md:px-0">
          <div className="flex items-center gap-3 text-[#4a4a4a]">
            <Leaf className="w-6 h-6 opacity-80" strokeWidth={1.5} />
            <h1 className="font-serif tracking-widest text-xl flex items-baseline gap-3">
              浮生誌 
              <span className="text-[9px] opacity-40 uppercase tracking-[0.3em] font-sans">Ephemera</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 資料狀態指示器 */}
            <div className="hidden md:flex items-center gap-2 text-[9px] opacity-40">
              <span>{records.length} 筆記錄</span>
              {isRefreshing && <span className="animate-pulse">● 同步中</span>}
            </div>
            <div className="flex items-center gap-3 bg-white/40 border border-white/60 backdrop-blur-md pl-4 pr-1.5 py-1.5 rounded-full shadow-sm hover:bg-white/60 transition-colors">
              <div className="flex flex-col items-end mr-1">
                 <span className="text-xs font-serif italic text-[#4a4a4a]">{user.name}</span>
                 <button onClick={logout} className="text-[9px] opacity-40 hover:opacity-80 uppercase tracking-widest transition-opacity mt-0.5">
                   登出 Logout
                 </button>
              </div>
              {user.picture ? (
                 <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full border border-white/80 shadow-sm" />
              ) : (
                 <div className="w-8 h-8 rounded-full bg-[#bccad6]/30 flex items-center justify-center border border-white/80">
                   <span className="text-xs font-serif">{user.name.charAt(0)}</span>
                 </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 w-full relative flex flex-col">
          <Routes>
             <Route path="/" element={
               <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1 w-full">
                 <div className="flex-none lg:flex-1 w-full flex flex-col gap-6 lg:gap-8 h-[380px] sm:h-[400px] lg:h-auto">
                   <FluidSlider onRecord={handleRecord} />
                 </div>
                 <div className="flex-none lg:flex-[1.2] w-full flex flex-col gap-6 lg:gap-8 h-[400px] lg:h-auto lg:min-h-0">
                   <WaterTank records={records} alertThreshold={3000} isRefreshing={isRefreshing} />
                 </div>
               </div>
             } />
             <Route path="/dashboard" element={
               <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 flex-1 w-full">
                 <div className="flex flex-col gap-6 lg:gap-8">
                   <BalanceRings records={records} />
                   <ActivityGrid records={records} />
                 </div>
                 <div className="flex flex-col gap-6 lg:gap-8 min-h-[300px] lg:min-h-0">
                   <LedgerChart records={records} />
                 </div>
               </div>
             } />
             <Route path="/history" element={
               <div className="flex-1 w-full flex flex-col">
                 {records.length === 0 ? (
                   <div className="flex-1 flex items-center justify-center">
                     <div className="text-center">
                       <p className="text-lg font-serif opacity-40 mb-2">尚無時光記錄</p>
                       <p className="text-xs opacity-30">請先在「盲記」頁面新增記錄，或匯入歷史資料</p>
                     </div>
                   </div>
                 ) : (
                   <RecordList records={records} onUpdate={handleUpdate} />
                 )}
               </div>
             } />
          </Routes>
        </div>
      </div>

      {/* Floating Bottom Navigation for Multi-page Structure */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
         <div className="flex items-center gap-2 bg-white/70 backdrop-blur-2xl border border-white/80 p-2 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
            <Link to="/" className={cn("px-6 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300", location.pathname === '/' ? "bg-[#4a4a4a] text-[#f5f2ed] shadow-md scale-105" : "text-[#4a4a4a]/50 hover:text-[#4a4a4a] hover:bg-white/50")}>
               <Plus className="w-5 h-5" strokeWidth={1.5} />
               <span className="text-[9px] font-sans tracking-widest uppercase">盲記</span>
            </Link>
            <Link to="/dashboard" className={cn("px-6 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300", location.pathname === '/dashboard' ? "bg-[#4a4a4a] text-[#f5f2ed] shadow-md scale-105" : "text-[#4a4a4a]/50 hover:text-[#4a4a4a] hover:bg-white/50")}>
               <BarChart className="w-5 h-5" strokeWidth={1.5} />
               <span className="text-[9px] font-sans tracking-widest uppercase">圖表</span>
            </Link>
            <Link to="/history" className={cn("px-6 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300", location.pathname === '/history' ? "bg-[#4a4a4a] text-[#f5f2ed] shadow-md scale-105" : "text-[#4a4a4a]/50 hover:text-[#4a4a4a] hover:bg-white/50")}>
               <Clock className="w-5 h-5" strokeWidth={1.5} />
               <span className="text-[9px] font-sans tracking-widest uppercase">時光</span>
            </Link>
         </div>
      </div>
    </div>
  );
}
