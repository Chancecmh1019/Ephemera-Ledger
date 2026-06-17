import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';

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
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

app.get("/api/records", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: "user_id is required" });
    }

    let userRecords = inMemoryDb.filter(r => r.user_id === user_id);

    if (supabase) {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase read error, falling back to memory:", error.message);
      } else if (data && data.length > 0) {
        userRecords = data;
        inMemoryDb = inMemoryDb.filter(r => r.user_id !== user_id).concat(userRecords);
      }
    }

    userRecords.sort((a, b) => {
      const db = new Date(b.created_at).getTime();
      const da = new Date(a.created_at).getTime();
      return (db || 0) - (da || 0);
    });
    res.json(userRecords);
  } catch (err: any) {
    console.error("GET /api/records unhandled error:", err.message);
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
      const { error } = await supabase.from('records').insert([newRecord]);
      if (error) {
        console.error("Supabase write error, falling back to memory:", error.message);
      }
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
      const { error } = await supabase
        .from('records')
        .update(updates)
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

    console.log(`Starting historical import for ${user_id}, records count: ${records.length}`);

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

    if (supabase) {
      const { error } = await supabase.from('records').insert(processedRecords);
      if (error) {
        console.error("Supabase batch insert error, falling back to memory:", error.message);
      } else {
        console.log(`Successfully batch inserted ${processedRecords.length} records into Supabase for User ${user_id}`);
      }
    }

    res.status(201).json({ success: true, count: processedRecords.length });
  } catch (err: any) {
    console.error("POST /api/auth/init-history unhandled error:", err.message);
    res.status(500).json({ error: err.message });
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
