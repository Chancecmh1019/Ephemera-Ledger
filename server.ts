import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";

const app = express();
app.use(express.json({ limit: '50mb' }));

export interface RecordData {
  id: string;
  line_user_id: string;
  type: string;
  amount: number;
  description: string;
  note: string;
  payment_method: string;
  created_at: string;
  is_urgent?: boolean;
}

let inMemoryDb: RecordData[] = [];
let seededUsers = new Set<string>();

async function getSheetOptions() {
  try {
    const isSheetEnabled = process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID;
    if (!isSheetEnabled) return null;
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    return { sheets, sheetId: process.env.GOOGLE_SHEET_ID };
  } catch (err: any) {
    console.error("Failed to initialize Google Sheets Auth:", err.message);
    return null;
  }
}

async function ensureSheetHeaders(sheetOptions: any) {
  try {
    const response = await sheetOptions.sheets.spreadsheets.values.get({
      spreadsheetId: sheetOptions.sheetId,
      range: '【浮生收支流水帳】!A1:H1',
    });
    if (!response.data.values || response.data.values.length === 0) {
       await sheetOptions.sheets.spreadsheets.values.update({
        spreadsheetId: sheetOptions.sheetId,
        range: '【浮生收支流水帳】!A1:H1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['用戶識別碼 (user_id)', '時間戳記', '標題', '付款方式 (現金/信用卡)', '類別 (收入/支出)', '金額', '是否為補填急件', 'Record_ID']]
        }
      });
    }
  } catch (e: any) {
    console.log("Error checking sheet headers:", e.message);
  }
}

app.get("/api/records", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: "user_id is required" });
    }

    const sheetOptions = await getSheetOptions();
    let userRecords = inMemoryDb.filter(r => r.line_user_id === user_id);

    if (sheetOptions) {
      try {
        await ensureSheetHeaders(sheetOptions);
        const response = await sheetOptions.sheets.spreadsheets.values.get({
          spreadsheetId: sheetOptions.sheetId,
          range: '【浮生收支流水帳】!A:H',
        });
        const rows = response.data.values || [];
        const sheetRecords = rows.slice(1)
          .filter(row => row[0] === user_id)
          .map((row, idx) => ({
            line_user_id: row[0],
            created_at: row[1],
            description: row[2],
            payment_method: row[3],
            type: row[4],
            amount: Number(row[5]),
            is_urgent: row[6] === 'true',
            id: row[7] || `sheet-${idx}`,
            note: ""
          }));
        
        // Merge records
        if (sheetRecords.length > 0) {
          userRecords = sheetRecords;
          inMemoryDb = inMemoryDb.filter(r => r.line_user_id !== user_id).concat(userRecords);
        }
      } catch (e: any) {
        console.error("Sheet read error, falling back to memory:", e.message);
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
    const { user_id, type, amount, description, payment_method, created_at, id, is_urgent } = req.body;
    if (!user_id || !type || amount == null || !description || !payment_method) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newRecord: RecordData = {
      id: id || crypto.randomUUID(),
      line_user_id: user_id,
      type,
      amount: Number(amount),
      description,
      note: "",
      payment_method,
      created_at: created_at || new Date().toISOString(),
      is_urgent: is_urgent || false
    };

    inMemoryDb.push(newRecord);

    const sheetOptions = await getSheetOptions();
    if (sheetOptions) {
      try {
        await sheetOptions.sheets.spreadsheets.values.append({
          spreadsheetId: sheetOptions.sheetId,
          range: '【浮生收支流水帳】!A:H',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              [newRecord.line_user_id, newRecord.created_at, newRecord.description, newRecord.payment_method, newRecord.type, newRecord.amount, newRecord.is_urgent ? 'true' : 'false', newRecord.id]
            ]
          }
        });
      } catch (e: any) {
        console.error("Sheet write error, falling back to memory:", e.message);
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

    const sheetOptions = await getSheetOptions();
    if (sheetOptions) {
      try {
        const response = await sheetOptions.sheets.spreadsheets.values.get({
          spreadsheetId: sheetOptions.sheetId,
          range: '【浮生收支流水帳】!A:H',
        });
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[7] === id);
        if (rowIndex !== -1) {
          const sheetRow = rowIndex + 1;
          const curr = rows[rowIndex];
          const newRow = [
            updates.line_user_id ?? curr[0],
            updates.created_at ?? curr[1],
            updates.description ?? curr[2],
            updates.payment_method ?? curr[3],
            updates.type ?? curr[4],
            updates.amount ?? curr[5],
            (updates.is_urgent !== undefined) ? (updates.is_urgent ? 'true' : 'false') : curr[6],
            id
          ];
          
          await sheetOptions.sheets.spreadsheets.values.update({
            spreadsheetId: sheetOptions.sheetId,
            range: `【浮生收支流水帳】!A${sheetRow}:H${sheetRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [newRow] }
          });
        }
      } catch (e: any) {
         console.error("Sheet update error:", e.message);
      }
    }
    
    res.json({ success: true, updated: inMemoryDb.find(r => r.id === id) });
  } catch (err: any) {
    console.error("PUT /api/records unhandled error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/records/:id", async (req, res) => {
  const { id } = req.params;
  inMemoryDb = inMemoryDb.filter(r => r.id !== id);

  const sheetOptions = await getSheetOptions();
  if (sheetOptions) {
    try {
      const response = await sheetOptions.sheets.spreadsheets.values.get({
        spreadsheetId: sheetOptions.sheetId,
        range: '【浮生收支流水帳】!A:H',
      });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[7] === id);
      if (rowIndex !== -1) { 
         const meta = await sheetOptions.sheets.spreadsheets.get({ spreadsheetId: sheetOptions.sheetId });
         const sheet = meta.data.sheets?.find(s => s.properties?.title === '【浮生收支流水帳】');
         if (sheet && sheet.properties?.sheetId != null) {
            await sheetOptions.sheets.spreadsheets.batchUpdate({
              spreadsheetId: sheetOptions.sheetId,
              requestBody: {
                requests: [{
                  deleteDimension: {
                    range: {
                      sheetId: sheet.properties.sheetId,
                      dimension: "ROWS",
                      startIndex: rowIndex,
                      endIndex: rowIndex + 1
                    }
                  }
                }]
              }
            });
         }
      }
    } catch (e: any) {
      console.error("Sheet delete error:", e.message);
    }
  }

  res.json({ success: true });
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
      line_user_id: user_id,
      type: r.type || 'expense',
      amount: Number(r.amount) || 0,
      description: r.description || '歷史紀錄匯入',
      note: "",
      payment_method: r.payment_method || 'cash',
      created_at: r.created_at || new Date().toISOString(),
      is_urgent: false
    }));

    inMemoryDb.push(...processedRecords);

    const sheetOptions = await getSheetOptions();
    if (sheetOptions) {
      try {
        await ensureSheetHeaders(sheetOptions);
        
        const rows = processedRecords.map(r => [
          r.line_user_id, r.created_at, r.description, r.payment_method, r.type, r.amount, r.is_urgent ? 'true' : 'false', r.id
        ]);

        await sheetOptions.sheets.spreadsheets.values.append({
          spreadsheetId: sheetOptions.sheetId,
          range: '【浮生收支流水帳】!A:H',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows }
        });
        console.log(`Successfully batch inserted ${rows.length} records into sheets for User ${user_id}`);
      } catch (e: any) {
        console.error("Sheet batch insert error, falling back to memory:", e.message);
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
