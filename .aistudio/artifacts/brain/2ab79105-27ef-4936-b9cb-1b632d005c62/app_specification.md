# TÀI LIỆU ĐẶC TẢ KIẾN TRÚC & HỆ THỐNG
## Ứng Dụng Quản Lý Chấm Công & Tăng Ca Văn Phòng Visual

---

### 1. Tổng Quan Hệ Thống (System Overview)
Ứng dụng **Chấm Công Văn Phòng Visual** là hệ thống quản trị nhân sự, theo dõi chấm công, quản lý làm thêm giờ (OT) và tự động tính toán phép năm chuyên nghiệp, được thiết kế tối ưu hóa cho môi trường làm việc sáng tạo với giao diện đồ họa WebGL tương tác cao.

- **Phiên bản hệ thống**: 2.5.0
- **Nền tảng**: Full-stack React 19 + Node.js Express + Google Cloud Run
- **Tích hợp cốt lõi**: Google Sheets API v4 (Đồng bộ 2 chiều thời gian thực) + Firebase Authentication

---

### 2. Mô Hình Phân Quyền Người Dùng (RBAC - Role-Based Access Control)

| Vai trò (Role) | Cổng đăng nhập / Xác thực | Quyền hạn nghiệp vụ |
| :--- | :--- | :--- |
| **Quản Trị Viên (Admin)** | Google OAuth 2.0 (Gmail tổ chức) | - Toàn quyền ghi nhận chấm công từng ngày cho mọi nhân sự.<br>- Đồng bộ trực tiếp 2 chiều lên các Sheet tháng Google Sheets.<br>- Thêm mới, chỉnh sửa, sắp xếp lại thứ tự nhân sự.<br>- Tự động kích hoạt cộng dồn phép năm đầu tháng.<br>- Xem nhật ký kiểm toán (Audit Logs) và cấu hình mã khóa. |
| **Kế Toán (Accountant)** | Khóa bảo mật Kế toán (`accountantKey`) | - Xem báo cáo tổng hợp công & OT của toàn công ty.<br>- Lọc báo cáo chi tiết theo tháng, năm, phòng ban.<br>- Xuất file bảng lương Excel (.xlsx) và báo cáo in ấn PDF.<br>- Tra cứu tỷ lệ nghỉ phép, nhân sự sắp hết hạn phép năm. |
| **Nhân Viên / Khách (Employee)** | Tra cứu trực tiếp theo tên nhân viên | - Cổng thông tin cá nhân: Xem lịch sử đi làm, số giờ tăng ca.<br>- Theo dõi quỹ ngày phép: Phép tồn năm trước, phép mới, đã dùng, còn lại.<br>- Giao diện bảo vệ quyền riêng tư (không sửa đổi dữ liệu công ty). |

---

### 3. Kiến Trúc Dữ Liệu & Đồng Bộ Google Sheets

```
[Người dùng / Admin]
       │
       ▼
┌──────────────────┐       HTTPS / REST v4        ┌─────────────────────────┐
│ React Client SPA │ ───────────────────────────► │ Google Sheets Bảng Tính │
└──────────────────┘                              └─────────────────────────┘
       ▲
       │ Fast State Sync & Cache
       ▼
┌──────────────────┐
│  Express Server  │ ◄─── Lưu đệm dữ liệu (app_state.json) để tải siêu tốc
└──────────────────┘
```

1. **Cấu trúc Google Sheets**:
   - `DANH_SACH_NV`: Bảng quản lý hồ sơ nhân viên (Họ tên, bộ phận, ngày vào làm, phép năm cơ bản, ngày sinh).
   - `CHAM_CONG_TONG_HOP`: Nhật ký chấm công chuẩn theo từng ngày (Ngày, Tên NV, Trạng thái, Giờ OT, Ghi chú).
   - `JANUARY ... DECEMBER`: Các Sheet tháng dạng lưới (Grid View) trực quan để xem nhanh cả tháng của từng nhân viên.
2. **Cơ chế tải dữ liệu Zero-Delay**:
   - Dữ liệu được lưu trong bộ nhớ đệm trình duyệt (`localStorage`) để hiển thị tức thì dưới 50ms khi mở app.
   - Express server lưu bản snapshot `app_state.json` để chia sẻ nhanh cho các phiên làm việc của nhân viên và kế toán mà không làm cạn hạn ngạch (quota) của Google Sheets API.

---

### 4. Giải Thuật Nghiệp Vụ Chấm Công & Phép Năm

- **Tính phép năm tích lũy**:
  - Mỗi nhân viên sau thời gian thử việc được cộng 1 ngày phép/tháng.
  - Tự động cộng thêm ngày phép thâm niên theo Luật Lao Động (mỗi 5 năm làm việc được cộng thêm 1 ngày phép).
  - Tự động kiểm tra vào đầu mỗi tháng mới để tăng chỉ tiêu ngày phép cho nhân viên chưa nghỉ việc.
- **Tính toán làm thêm giờ (OT)**:
  - Tự động tính khoảng thời gian từ `otFrom` đến `otTo`.
  - Phân loại OT ngày thường (hệ số 1.5x) và OT ngày nghỉ/lễ (hệ số 2.0x hoặc 3.0x theo quy định).

---

### 5. Kiến Trúc Trải Nghiệm Người Dùng (Visual & Audio Experience)

1. **Bộ máy đồ họa WebGL Van Gogh & Aurora**:
   - **Shaders**: Fragment Shader biên dịch song song trên GPU mô phỏng bầu trời đêm Van Gogh, dải cực quang uốn lượn và rặng núi nhấp nhô.
   - **Sao băng vật lý**: Thuật toán tính trọng lực và ma sát không khí cho vệt sao băng rơi tương tác theo chuột.
   - **Bayer Dithering 8x8**: Giảm thiểu hiện tượng color banding khi hiển thị gradient bầu trời đêm.
2. **Môi trường âm thanh nền (Ambient Soundscape)**:
   - Tích hợp 4 bản nhạc nền thư giãn chuẩn binaural: Mưa rào đêm, Rừng sâu huyền ảo, Không gian Lofi và Tiếng sóng biển.
   - Bộ tổng hợp âm thanh phản hồi click/thao tác (Sound FX) sử dụng Web Audio API không phụ thuộc file âm thanh ngoài.
3. **Chế độ Zen (Chỉ xem Nền & Sao)**:
   - Ẩn toàn bộ thanh công cụ và bảng biểu phức tạp.
   - Cung cấp HUD điều khiển ánh sáng, tốc độ thiên hà và bảng chọn chủ đề màu sắc trực tiếp.

---

### 6. Cấu Hình Biến Môi Trường (Environment Variables)

| Tên biến | Mục đích | Yêu cầu bắt buộc |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Chìa khóa gọi AI Google Gemini để hỗ trợ phân tích dữ liệu chấm công | Có (Quản lý qua mục Secrets) |
| `VITE_GOOGLE_CLIENT_ID` | Client ID cho Google OAuth2 đăng nhập quản trị viên | Tùy chọn (đã tích hợp Firebase) |
| `NODE_ENV` | Chế độ chạy: `production` hoặc `development` | Tự động thiết lập |
