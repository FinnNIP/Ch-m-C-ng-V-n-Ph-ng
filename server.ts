import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

dotenv.config();

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// State File Setup
const STATE_FILE = path.join(process.cwd(), "app_state.json");

interface AppState {
  employees: any[];
  timeLogs: any[];
  spreadsheetId: string;
  security: {
    securityEnabled: boolean;
    departmentEmails: string;
    departmentPassword?: string;
    accountantKey: string;
  };
  auditLogs: any[];
}

let appState: AppState = {
  employees: [],
  timeLogs: [],
  spreadsheetId: "1WBVOBjsnSOEGKwTuKzf1LVH0ErOdzmAUKk2Bg9MtoTs",
  security: {
    securityEnabled: false,
    departmentEmails: "",
    departmentPassword: "",
    accountantKey: "visual-accounting"
  },
  auditLogs: []
};

// Load state on startup
try {
  if (fs.existsSync(STATE_FILE)) {
    const fileData = fs.readFileSync(STATE_FILE, "utf-8");
    appState = JSON.parse(fileData);
    if (!appState.employees) appState.employees = [];
    if (!appState.timeLogs) appState.timeLogs = [];
    if (!appState.security) {
      appState.security = {
        securityEnabled: false,
        departmentEmails: "",
        departmentPassword: "",
        accountantKey: "visual-accounting"
      };
    }
    if (!appState.auditLogs) appState.auditLogs = [];
  } else {
    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2), "utf-8");
  }
} catch (error) {
  console.error("Lỗi khi tải app_state.json từ đĩa:", error);
}

// Save state helper
const saveStateToDisk = () => {
  fs.writeFile(STATE_FILE, JSON.stringify(appState, null, 2), "utf-8", (error) => {
    if (error) {
      console.error("Lỗi khi lưu app_state.json lên đĩa:", error);
    }
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set payload limit for base64 images
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Get state (Admin, Accountant, Guest, Employee)
  app.get("/api/app-state", (req, res) => {
    const { role, key, email } = req.query;
    const timestamp = new Date().toISOString();
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // Accountant Access Validation
    if (role === "accountant") {
      const storedKey = appState.security?.accountantKey || "visual-accounting";
      if (key !== storedKey) {
        return res.status(401).json({ error: "Mã khóa bảo mật Kế toán không chính xác" });
      }
      
      // Log accountant view action
      appState.auditLogs.unshift({
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        timestamp,
        user: "Kế toán (Guest)",
        action: "Xem Báo cáo & Thống kê",
        details: `Truy cập từ IP: ${clientIp}`
      });
      saveStateToDisk();

      const safeSecurity = { ...appState.security };
      delete safeSecurity.departmentPassword;

      return res.json({
        employees: appState.employees,
        timeLogs: appState.timeLogs,
        spreadsheetId: appState.spreadsheetId,
        security: safeSecurity
      });
    }

    // Guest/Employee view access
    if (role === "employee" || role === "guest") {
      // Log guest initial access
      appState.auditLogs.unshift({
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        timestamp,
        user: "Nhân viên (Guest)",
        action: "Truy cập Cổng tra cứu nhân viên",
        details: `Truy cập từ IP: ${clientIp}`
      });
      saveStateToDisk();

      const safeSecurity = { ...appState.security };
      delete safeSecurity.departmentPassword;

      return res.json({
        employees: appState.employees,
        timeLogs: appState.timeLogs,
        spreadsheetId: appState.spreadsheetId,
        security: safeSecurity
      });
    }

    // Admin Access Logging
    if (email) {
      appState.auditLogs.unshift({
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        timestamp,
        user: String(email),
        action: "Tải dữ liệu hệ thống (Admin)",
        details: `Truy cập từ IP: ${clientIp}`
      });
      saveStateToDisk();
    }

    const safeSecurity = { ...appState.security };
    return res.json({
      employees: appState.employees,
      timeLogs: appState.timeLogs,
      spreadsheetId: appState.spreadsheetId,
      security: safeSecurity
    });
  });

  // API Route: Save state (Admin only)
  app.post("/api/app-state", (req, res) => {
    try {
      const { employees, timeLogs, spreadsheetId, security, email } = req.body;

      if (employees !== undefined) appState.employees = employees;
      if (timeLogs !== undefined) appState.timeLogs = timeLogs;
      if (spreadsheetId !== undefined) appState.spreadsheetId = spreadsheetId;
      if (security !== undefined) {
        appState.security = {
          ...appState.security,
          ...security
        };
      }

      const timestamp = new Date().toISOString();
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      appState.auditLogs.unshift({
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        timestamp,
        user: email || "Quản trị viên (Admin)",
        action: "Cập nhật dữ liệu & cấu hình",
        details: `Đồng bộ qua API từ IP: ${clientIp}`
      });

      saveStateToDisk();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Add audit log (Custom events)
  app.post("/api/audit-log", (req, res) => {
    try {
      const { user, action, details } = req.body;
      const timestamp = new Date().toISOString();

      appState.auditLogs.unshift({
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        timestamp,
        user: user || "Ẩn danh",
        action: action || "Hành động hệ thống",
        details: details || ""
      });

      if (appState.auditLogs.length > 500) {
        appState.auditLogs = appState.auditLogs.slice(0, 500);
      }

      saveStateToDisk();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get audit logs (Admin only)
  app.get("/api/audit-logs", (req, res) => {
    res.json(appState.auditLogs);
  });

  // API Route: Verify face matching
  app.post("/api/verify-face", async (req, res) => {
    try {
      const { registeredImage, capturedImage } = req.body;

      if (!registeredImage || !capturedImage) {
        return res.status(400).json({ error: "Thiếu hình ảnh đăng ký hoặc hình ảnh chụp thực tế" });
      }

      // Helper to parse data URI or plain base64
      const parseBase64 = (base64Str: string) => {
        const match = base64Str.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          return {
            mimeType: match[1],
            data: match[2]
          };
        }
        return {
          mimeType: "image/jpeg",
          data: base64Str
        };
      };

      const img1 = parseBase64(registeredImage);
      const img2 = parseBase64(capturedImage);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: img1.mimeType,
              data: img1.data
            }
          },
          {
            inlineData: {
              mimeType: img2.mimeType,
              data: img2.data
            }
          },
          {
            text: "Compare these two photos. Photo 1 is the registered profile photo of an employee. Photo 2 is a webcam photo captured during check-in/check-out. Determine if they are the exact same person. Output your answer in JSON format with fields: samePerson (boolean), confidence (number between 0 and 1 indicating how confident you are), and explanation (string in Vietnamese explaining why you made this decision, citing facial features, hair, eyes, nose, shape, etc.). Be very professional and accurate."
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any,
            properties: {
              samePerson: { type: "BOOLEAN" as any },
              confidence: { type: "NUMBER" as any },
              explanation: { type: "STRING" as any }
            },
            required: ["samePerson", "confidence", "explanation"]
          }
        }
      });

      const textResult = response.text;
      if (!textResult) {
        throw new Error("Không nhận được kết quả từ mô hình AI");
      }

      const result = JSON.parse(textResult);
      res.json(result);

    } catch (error: any) {
      console.error("Lỗi xác thực khuôn mặt:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi đối chiếu khuôn mặt: " + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
