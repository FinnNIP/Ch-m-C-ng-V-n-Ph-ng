import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import nodemailer from "nodemailer";

dotenv.config();

// Rate limiting map for email notifications to prevent inbox flooding from background polling
const lastAlertTimestamps: Record<string, number> = {};
const EMAIL_ALERT_LIMIT_MS = 10 * 60 * 1000; // 10 minutes rate limit per IP/User

// Send Email Alert function
async function sendSecurityEmailAlert(role: string, ip: string, details: string) {
  const targetEmailPrimary = "darklight66953@gmail.com";
  const targetEmailSecondary = "darklight6953@gmail.com";
  
  // Create unique key for rate-limiting per role + ip
  const limitKey = `${role}_${ip}`;
  const now = Date.now();
  if (lastAlertTimestamps[limitKey] && (now - lastAlertTimestamps[limitKey] < EMAIL_ALERT_LIMIT_MS)) {
    console.log(`[Email Shield] Rate limited: Skip sending email for ${role} from IP ${ip} (cooldown remaining: ${Math.round((EMAIL_ALERT_LIMIT_MS - (now - lastAlertTimestamps[limitKey])) / 1000)}s)`);
    return;
  }
  lastAlertTimestamps[limitKey] = now;

  const timestampStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const mailSubject = `⚠️ [CẢNH BÁO TRUY CẬP] - Phát hiện truy cập mới từ ${role === 'accountant' ? 'Kế toán' : 'Nhân viên / Guest'}`;
  
  const mailHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
        <span style="font-size: 40px;">⚠️</span>
        <h2 style="color: #0f172a; margin: 10px 0 0 0; font-weight: 800;">HỆ THỐNG PHÒNG THỦ TRUY CẬP</h2>
        <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Cảnh báo bảo mật thời gian thực cho ứng dụng Chấm Công Visual</p>
      </div>
      
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Xin chào Admin,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hệ thống vừa phát hiện một lượt truy cập mới từ người dùng ngoài nhóm quản trị viên. Dưới đây là thông tin chi tiết:</p>
      
      <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #475569; width: 140px; font-size: 14px;">Cổng truy cập:</td>
            <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${role === 'accountant' ? 'Kế Toán (Accountant View)' : 'Nhân Viên / Khách (Employee/Guest View)'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #475569; font-size: 14px;">Địa chỉ IP:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px;">${ip}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #475569; font-size: 14px;">Thời gian:</td>
            <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${timestampStr} (Giờ Việt Nam)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #475569; font-size: 14px;">Hành động:</td>
            <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${details}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 25px;">
        * Cảnh báo này được tự động gửi từ hệ thống bảo mật Cloud Run container của bạn. Để ngừng nhận hoặc thay đổi cấu hình, vui lòng chỉnh sửa biến môi trường trong trang cài đặt.
      </p>
    </div>
  `;

  // Try real SMTP send if variables exist
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"Hệ thống Chấm Công Visual" <${process.env.SMTP_USER}>`,
        to: `${targetEmailPrimary}, ${targetEmailSecondary}`,
        subject: mailSubject,
        html: mailHtml,
      });

      console.log(`[Email Shield] Thư thông báo thực tế đã được gửi thành công: ${info.messageId}`);
    } catch (err: any) {
      console.error(`[Email Shield] Lỗi khi gửi thư thực tế qua SMTP:`, err.message);
    }
  } else {
    // Beautiful console simulation
    console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│               🛡️ SIMULATED EMAIL DISPATCH (SECURITY SHIELD)            │
├────────────────────────────────────────────────────────────────────────┤
│ Gửi từ:  "Hệ thống Chấm Công Visual" <alerts@visual-chamcong.local>   │
│ Gửi tới: ${targetEmailPrimary}, ${targetEmailSecondary}              │
│ Chủ đề:  ${mailSubject}                                              │
├────────────────────────────────────────────────────────────────────────┤
│ Vai trò: ${role.toUpperCase()}                                         │
│ Địa chỉ IP: ${ip}                                                     │
│ Thời gian: ${timestampStr}                                            │
│ Sự kiện: ${details}                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ 💡 Để gửi thư thật, cấu hình các biến môi trường sau trong cài đặt:   │
│    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE           │
└────────────────────────────────────────────────────────────────────────┘
    `);
  }
}

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

  // API Route: Client Error Logger
  app.post("/api/client-error", (req, res) => {
    console.error("[CLIENT_ERROR_REPORT]", JSON.stringify(req.body, null, 2));
    res.json({ status: "logged" });
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
      
      const ipString = String(clientIp || "unknown");
      
      // Log accountant view action
      appState.auditLogs.unshift({
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        timestamp,
        user: "Kế toán (Guest)",
        action: "Xem Báo cáo & Thống kê",
        details: `Truy cập từ IP: ${ipString}`
      });
      saveStateToDisk();

      // Send email alert asynchronously without blocking HTTP response
      sendSecurityEmailAlert("accountant", ipString, "Xem Báo cáo & Thống kê kế toán").catch(err => {
        console.error("[Email Alert Error] Lỗi gửi cảnh báo email kế toán:", err);
      });

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
      const ipString = String(clientIp || "unknown");

      // Log guest initial access
      appState.auditLogs.unshift({
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        timestamp,
        user: "Nhân viên (Guest)",
        action: "Truy cập Cổng tra cứu nhân viên",
        details: `Truy cập từ IP: ${ipString}`
      });
      saveStateToDisk();

      // Send email alert asynchronously without blocking HTTP response
      sendSecurityEmailAlert(role, ipString, "Truy cập Cổng tra cứu chấm công nhân viên").catch(err => {
        console.error("[Email Alert Error] Lỗi gửi cảnh báo email nhân viên:", err);
      });

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

  // API Route: AI Assistant Chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, contextData } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Thiếu tin nhắn" });
      }

      const employeesCount = appState.employees?.length || 0;
      const logsCount = appState.timeLogs?.length || 0;
      
      let contextStatsPrompt = `Hiện tại hệ thống có ${employeesCount} nhân viên và ${logsCount} bản ghi chấm công.`;
      if (contextData) {
        contextStatsPrompt += `\nDữ liệu báo cáo hiện tại:\n${JSON.stringify(contextData, null, 2)}`;
      }

      const systemInstruction = `Bạn là Trợ lý AI Chuyên gia Nhân sự & Kế toán Chấm công (gọi tắt là "Trợ lý Chấm Công Visual").
Nhiệm vụ của bạn là hỗ trợ quản trị viên, kế toán và nhân viên giải đáp thắc mắc về bảng chấm công, ngày phép, giờ tăng ca (OT), phân tích hiệu suất làm việc hoặc đề xuất giải pháp tối ưu hóa nhân sự.
Hãy trả lời một cách lịch sự, chuyên nghiệp, súc tích và cực kỳ chính xác bằng tiếng Việt.
Dưới đây là bối cảnh dữ liệu hiện tại của hệ thống để bạn phân tích và tham khảo khi trả lời:
${contextStatsPrompt}

Lưu ý:
- Nếu người dùng hỏi về thống kê cụ thể, hãy dựa vào dữ liệu báo cáo được cung cấp ở trên để phân tích.
- Luôn giữ thái độ bảo mật, trung thực và xây dựng.`;

      const formattedHistory = (history || []).map((h: any) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...formattedHistory,
          { text: message }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const textResult = response.text;
      res.json({ text: textResult || "Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn." });

    } catch (error: any) {
      console.error("Lỗi trợ lý AI:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi kết nối trợ lý AI: " + error.message });
    }
  });

  // Serve public directory (favicons, static assets)
  app.use(express.static(path.join(process.cwd(), "public")));
  app.get("/favicon.ico", (req, res) => {
    res.type("image/svg+xml").sendFile(path.join(process.cwd(), "public", "favicon.svg"));
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
