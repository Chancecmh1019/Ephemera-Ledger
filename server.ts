import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 載入環境變數（Vercel 會自動注入，但本地開發需要）
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
app.use(express.json({ limit: '50mb' }));

export interface RecordData {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string;
  note: string;
  payment_method: string;
  created_at: string;
  is_urgent?: boolean;
}

let inMemoryDb: RecordData[] = [];

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

console.log('🔧 環境檢查:');
console.log('- SUPABASE_URL:', supabaseUrl ? '✅ 已設定' : '❌ 未設定');
console.log('- SUPABASE_KEY:', supabaseKey ? '✅ 已設定' : '❌ 未設定');

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
  console.warn('⚠️ Supabase 未設定！資料將僅儲存在記憶體中。');
  console.warn('請在 .env 檔案中設定 SUPABASE_URL 和 SUPABASE_KEY');
} else {
  console.log('✅ Supabase 客戶端已初始化');
}

app.get("/api/records", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: "user_id is required" });
    }

    console.log(`📖 讀取記錄: user_id=${user_id}`);

    let userRecords = inMemoryDb.filter(r => r.user_id === user_id);

    if (supabase) {
      try {
        console.log(`🔄 從 Supabase 查詢資料...`);
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .eq('line_user_id', user_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("❌ Supabase 讀取錯誤:", error.message);
          console.error("詳細錯誤:", error);
          // 回傳記憶體中的資料作為 fallback
        } else if (data && data.length > 0) {
          console.log(`✅ 從 Supabase 讀取到 ${data.length} 筆資料`);
          userRecords = data.map(record => {
            const { line_user_id, ...rest } = record;
            return { ...rest, user_id: line_user_id } as RecordData;
          });
          // 更新記憶體快取
          inMemoryDb = inMemoryDb.filter(r => r.user_id !== user_id).concat(userRecords);
        } else {
          console.log(`ℹ️ Supabase 中沒有資料，使用記憶體資料 (${userRecords.length} 筆)`);
        }
      } catch (supabaseError: any) {
        console.error("❌ Supabase 連線錯誤:", supabaseError.message);
        // 繼續使用記憶體資料
      }
    } else {
      console.log(`⚠️ Supabase 未設定，使用記憶體資料 (${userRecords.length} 筆)`);
    }

    userRecords.sort((a, b) => {
      const db = new Date(b.created_at).getTime();
      const da = new Date(a.created_at).getTime();
      return (db || 0) - (da || 0);
    });
    
    console.log(`✅ 回傳 ${userRecords.length} 筆記錄`);
    res.json(userRecords);
  } catch (err: any) {
    console.error("❌ GET /api/records 錯誤:", err.message);
    console.error("完整錯誤:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post("/api/records", async (req, res) => {
  try {
    const { user_id, type, amount, description, payment_method, created_at, id, is_urgent, note } = req.body;
    if (!user_id || !type || amount == null || !description || !payment_method) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newRecord: RecordData = {
      id: id || crypto.randomUUID(),
      user_id: user_id,
      type,
      amount: Number(amount),
      description,
      note: note || "",
      payment_method,
      created_at: created_at || new Date().toISOString(),
      is_urgent: is_urgent || false
    };

    inMemoryDb.push(newRecord);

    if (supabase) {
      const { user_id, ...rest } = newRecord;
      const supabaseRecord = { ...rest, line_user_id: user_id };
      console.log(`儲存記錄到 Supabase: ${description}, 金額: ${amount}`);
      const { error } = await supabase.from('records').insert([supabaseRecord]);
      if (error) {
        console.error("❌ Supabase 寫入錯誤:", error.message, error);
        // 仍然回傳成功，因為已儲存到記憶體
      } else {
        console.log('✅ Supabase 寫入成功');
      }
    } else {
      console.warn('⚠️ Supabase 未設定，僅儲存到記憶體');
    }

    res.status(201).json(newRecord);
  } catch (err: any) {
    console.error("POST /api/records unhandled error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; 
    
    const index = inMemoryDb.findIndex(r => r.id === id);
    if (index !== -1) {
      inMemoryDb[index] = { ...inMemoryDb[index], ...updates };
    }

    if (supabase) {
      const supabaseUpdates = { ...updates } as any;
      if (supabaseUpdates.user_id) {
        supabaseUpdates.line_user_id = supabaseUpdates.user_id;
        delete supabaseUpdates.user_id;
      }
      
      const { error } = await supabase
        .from('records')
        .update(supabaseUpdates)
        .eq('id', id);

      if (error) {
        console.error("Supabase update error:", error.message);
      }
    }
    
    res.json({ success: true, updated: inMemoryDb.find(r => r.id === id) });
  } catch (err: any) {
    console.error("PUT /api/records unhandled error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    inMemoryDb = inMemoryDb.filter(r => r.id !== id);

    if (supabase) {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Supabase delete error:", error.message);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE unhandled error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/init-history", async (req, res) => {
  try {
    const { user_id, records } = req.body;
    if (!user_id || !Array.isArray(records)) {
      return res.status(400).json({ error: "user_id and records array are required" });
    }

    console.log(`🔄 開始匯入歷史資料: 使用者 ${user_id}, 共 ${records.length} 筆記錄`);

    const processedRecords: RecordData[] = records.map(r => ({
      id: r.id || crypto.randomUUID(),
      user_id: user_id,
      type: r.type || 'expense',
      amount: Number(r.amount) || 0,
      description: r.description || '歷史紀錄匯入',
      note: r.note || "",
      payment_method: r.payment_method || 'cash',
      created_at: r.created_at || new Date().toISOString(),
      is_urgent: false
    }));

    inMemoryDb.push(...processedRecords);
    console.log(`✅ 已將 ${processedRecords.length} 筆資料加入記憶體`);

    if (supabase) {
      const supabaseRecords = processedRecords.map(r => {
        const { user_id, ...rest } = r;
        return {
          ...rest,
          line_user_id: user_id
        };
      });
      
      console.log(`🔄 正在批次寫入 Supabase (共 ${supabaseRecords.length} 筆)...`);
      
      // Vercel Serverless Functions 有時間限制，所以分批處理
      const BATCH_SIZE = 500; // 每批 500 筆
      let totalInserted = 0;
      
      for (let i = 0; i < supabaseRecords.length; i += BATCH_SIZE) {
        const batch = supabaseRecords.slice(i, i + BATCH_SIZE);
        console.log(`處理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(supabaseRecords.length / BATCH_SIZE)}: ${batch.length} 筆`);
        
        const { error, data } = await supabase.from('records').insert(batch);
        
        if (error) {
          console.error(`❌ 批次 ${Math.floor(i / BATCH_SIZE) + 1} 寫入錯誤:`, error.message);
          // 繼續處理下一批，不中斷
        } else {
          totalInserted += batch.length;
          console.log(`✅ 批次 ${Math.floor(i / BATCH_SIZE) + 1} 寫入成功`);
        }
      }
      
      console.log(`✅ 完成！成功寫入 ${totalInserted}/${processedRecords.length} 筆資料到 Supabase`);
      
      if (totalInserted < processedRecords.length) {
        return res.status(207).json({ 
          success: true, 
          count: totalInserted,
          total: processedRecords.length,
          message: `部分成功：${totalInserted}/${processedRecords.length} 筆已儲存`
        });
      }
    } else {
      console.warn('⚠️ Supabase 未設定，資料僅儲存在記憶體中');
    }

    res.status(201).json({ success: true, count: processedRecords.length });
  } catch (err: any) {
    console.error("❌ POST /api/auth/init-history 錯誤:", err.message);
    console.error("完整錯誤:", err);
    res.status(500).json({ error: err.message, details: err.toString() });
  }
});

export const apiApp = app;

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
