# ⏱️ Chấm Công Văn Phòng Visual (Office Attendance & Timesheet System)

<div align="center">

![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-API_v4-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![WebGL](https://img.shields.io/badge/WebGL-Van_Gogh_Shader-990000?style=for-the-badge&logo=webgl&logoColor=white)

**Hệ thống quản lý chấm công, tăng ca (OT) & tính phép năm thông minh, đồng bộ hóa 2 chiều thời gian thực với Google Sheets và phân tích báo cáo trực quan.**

[Tính năng](#-tính-năng-nổi-bật) • [Kiến trúc](#-kiến-trúc--phân-quyền) • [Cài đặt](#-hướng-dẫn-cài-đặt--chạy-dự-án) • [Cấu hình Sheets](#-cấu-hình-google-sheets) • [Đồ họa & Âm thanh](#-trải-nghiệm-nghệ-thuật-webgl--âm-thanh)

</div>

---

## 🌟 Giới Thiệu Tổng Quan

**Chấm Công Văn Phòng Visual** là giải pháp phần mềm quản trị nhân sự hiện đại, kết hợp sức mạnh lưu trữ linh hoạt của **Google Sheets** với giao diện SPA tốc độ cao, khả năng nén phản hồi tức thì và đồ họa WebGL tương tác nghệ thuật.

Hệ thống loại bỏ hoàn toàn việc nhập liệu thủ công rườm rà trên bảng tính, cung cấp cơ chế phân quyền 3 tầng độc lập và tự động hóa các bài toán tính lương, tính phép theo Luật Lao Động.

---

## 🚀 Tính Năng Nổi Bật

### 1. 📅 Quản Lý Điểm Danh & Tăng Ca (Attendance & OT)
- **Ghi nhận 1-Click**: Đánh dấu trạng thái làm việc (*Có đi làm*, *Nghỉ phép*, *Nghỉ không phép*, *Nghỉ lễ*).
- **Tính giờ OT tự động**: Nhập khung giờ làm thêm (từ - đến), hệ thống tự động quy đổi số giờ công và áp dụng hệ số lương ngoài giờ.
- **Lịch ngày lễ Việt Nam**: Tự động nhận diện và làm nổi bật các ngày nghỉ lễ quốc gia trong năm theo quy định.

### 2. 🔄 Đồng Bộ 2 Chiều Google Sheets (Bi-directional Sync)
- **REST API v4**: Đọc và ghi trực tiếp vào tệp Google Sheets của tổ chức mà không cần server trung gian phức tạp.
- **Đồng bộ Sheet tháng dạng lưới (Grid View)**: Quét và đồng bộ ngược dữ liệu từ các sheet tháng (`JANUARY`, `FEBRUARY`, v.v.) vào bảng tổng hợp.
- **Bộ nhớ đệm Zero-Delay**: Tự động lưu cache trên trình duyệt (`localStorage`) và máy chủ (`app_state.json`), giúp tải dữ liệu tức thì dưới 50ms.

### 3. 🏖️ Quản Lý Phép Năm Tự Động (Annual Leave Automation)
- **Tự động cộng dồn hàng tháng**: Tự động tăng 1 ngày phép cho nhân viên vào ngày đầu tiên của mỗi tháng.
- **Thâm niên theo Luật Lao Động**: Tự động tính toán và cộng thêm 1 ngày phép cho mỗi 5 năm cống hiến.
- **Quản lý số dư phép**: Tính toán chính xác số ngày phép tồn năm cũ, phép mới phát sinh, phép đã dùng và số ngày phép còn lại.

### 4. 📊 Báo Cáo Kế Toán & Xuất File (Export & Analytics)
- **Xuất Excel chuyên nghiệp (`.xlsx`)**: Tích hợp `exceljs` tạo bảng tính lương hoàn chỉnh với đầy đủ công thức tính toán và định dạng màu sắc.
- **Xuất Báo Cáo PDF in ấn**: Tích hợp `jspdf` và `html2canvas` để tạo biên bản chấm công định dạng chuẩn A4.
- **Biểu đồ thống kê Recharts**: Trực quan hóa tỷ lệ chuyên cần, phân bổ OT theo từng phòng ban và cá nhân.

### 5. 👥 Cổng Tra Cứu Nhân Viên Cá Nhân (Employee Portal)
- Nhân viên tra cứu lịch sử đi làm và quỹ ngày phép cá nhân nhanh chóng chỉ bằng cách chọn tên, không cần tài khoản quản trị hay quyền can thiệp vào bảng tính.

---

## 🏛️ Kiến Trúc & Phân Quyền (RBAC)

```
┌─────────────────────────────────────────────────────────────┐
│                      ỨNG DỤNG CLIENT                        │
├─────────────────┬─────────────────────────┬─────────────────┤
│  Quản Trị Viên  │         Kế Toán         │    Nhân Viên    │
│  (Google OAuth) │    (Mã PIN Kế Toán)     │ (Tra cứu nhanh) │
└────────┬────────┴────────────┬────────────┴────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 EXPRESS BACKEND / FAST CACHE                │
│    (Nén Gzip, Quản lý trạng thái, Bảo mật dữ liệu nội bộ)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 GOOGLE SHEETS BẢNG TÍNH LÕI                 │
│      (DANH_SACH_NV, CHAM_CONG_TONG_HOP, Sheet 12 Tháng)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Trải Nghiệm Nghệ Thuật WebGL & Âm Thanh

- **🌌 Bầu trời đêm Van Gogh & Aurora**: Bức tranh chuyển động với dòng sông Rhône lấp lánh ánh nước, sao băng rơi theo quỹ đạo vật lý thực tế, dải cực quang nhảy múa và hiệu ứng dither 8x8 Bayer.
- **🎵 Âm thanh thiên nhiên đa kênh (Binaural Audio)**: 4 bản nhạc nền tích hợp sẵn (*Mưa đêm*, *Rừng sâu*, *Vũ trụ Lofi*, *Sóng biển*) giúp giải tỏa căng thẳng trong giờ làm việc.
- **✨ Chế độ Zen**: Ẩn toàn bộ giao diện bảng biểu chỉ bằng 1 nút bấm để thả hồn ngắm bầu trời sao và tương tác chuột tạo sóng ánh sáng.

---

## 💻 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu cầu hệ thống:
- **Node.js**: v18.0.0 trở lên (khuyên dùng Node 20+)
- **Trình quản lý gói**: `npm` hoặc `bun`

### Các bước cài đặt:

1. **Clone repository về máy**:
   ```bash
   git clone <URL_REPOSITORY_CỦA_BẠN>
   cd <THƯ_MỤC_DỰ_ÁN>
   ```

2. **Cài đặt thư viện phụ thuộc**:
   ```bash
   npm install
   ```

3. **Thiết lập biến môi trường**:
   Sao chép file `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
   Cấu hình các khóa cần thiết:
   ```env
   # API Key cho Trợ lý AI (Google Gemini)
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Cổng máy chủ (mặc định 3000)
   PORT=3000
   ```

4. **Khởi chạy môi trường phát triển (Development)**:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại địa chỉ: `http://localhost:3000`

5. **Biên dịch bản thương mại (Production Build)**:
   ```bash
   npm run build
   npm start
   ```

---

## 📑 Cấu Hình Google Sheets

Để hệ thống hoạt động chính xác với file Google Sheets của bạn:
1. Tạo một bảng tính Google Sheets mới.
2. Đặt ID của bảng tính trong trang **Cấu hình Google Sheets** của ứng dụng.
3. Đảm bảo cấu trúc các tab tối thiểu:
   - **`DANH_SACH_NV`**: Cột A (*Họ và tên*), Cột B (*Chức vụ/Vai trò*), Cột C (*Ngày vào làm*), Cột D (*Ngày nghỉ việc*), Cột E (*Hạn mức phép năm*).
   - **`CHAM_CONG_TONG_HOP`**: Cột A (*Ngày YYYY-MM-DD*), Cột B (*Tên nhân viên*), Cột C (*Trạng thái*), Cột D (*Số giờ OT*), Cột E (*Từ giờ*), Cột F (*Đến giờ*), Cột G (*Ghi chú*).
   - Hệ thống có nút **"Khởi tạo cấu trúc mẫu"** để tự động tạo tất cả các sheet chỉ trong 1 cú click.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion (Framer Motion).
- **Icons**: Lucide React.
- **Biểu đồ & Báo cáo**: Recharts, ExcelJS, jsPDF, html2canvas.
- **Backend & Middleware**: Express.js, Compression (Gzip), Google GenAI SDK.
- **Authentication**: Firebase Authentication (Google Identity Provider).
- **Đồ họa**: WebGL 1.0 / GLSL Shaders, Canvas API, Web Audio API.

---

## 📄 Bản Quyền (License)

Dự án được phát hành dưới giấy phép mã nguồn mở **MIT License**. Tự do sử dụng, tùy biến và phát triển cho các doanh nghiệp và tổ chức.

<div align="center">
  <sub>Được phát triển với niềm đam mê sáng tạo và tối ưu hóa hiệu suất tối đa.</sub>
</div>
