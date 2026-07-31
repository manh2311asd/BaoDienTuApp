# 📱 MOBILE APP (THE DAILY) — REACT NATIVE

Phân hệ ứng dụng di động đọc báo dành cho độc giả và không gian làm việc của phóng viên/kiểm duyệt viên trên thiết bị di động, được phát triển bằng React Native 0.81 và Expo SDK 54.

---

## 👥 1. QUY TẮC LÀM VIỆC NHÓM (GIT WORKFLOW)
Tất cả các lập trình viên Mobile App phải tuân thủ nghiêm ngặt quy tắc quản lý nhánh:
1.  **Nhánh `main`:** Chứa mã nguồn hoàn thiện, ổn định nhất (Production-ready).
2.  **Nhánh `dev`:** Chứa code được merge từ các nhánh tính năng (`feature/*`) để chạy thử nghiệm và kiểm thử.
3.  **Tạo nhánh tính năng:** Bắt buộc đặt tên nhánh theo định dạng `feature/<Tên tính năng bằng tiếng Anh>` (Ví dụ: `feature/offline-reading`, `feature/tts-voice`).
4.  **Tuyệt đối không push trực tiếp vào `main` hoặc `dev`:** Thực hiện đẩy code nhánh tính năng lên GitHub và tạo Pull Request (PR) để merge vào `dev`. Chỉ merge sau khi có ít nhất 1 thành viên review và duyệt code.
5.  **Commit Message:** Commit message phải mô tả rõ ràng, cụ thể thay đổi đã thực hiện (Ví dụ: `feat: add offline detail screen`, `fix: correct token storage validation`).

---

## 🛠️ 2. HƯỚNG DẪN CẤU HÌNH & KHỞI CHẠY

### Yêu cầu cấu hình hệ thống:
*   Node.js phiên bản 22+.
*   Ứng dụng **Expo Go** đã cài đặt trên điện thoại thật (hoặc cài Android Studio Emulator/Xcode iOS Simulator trên máy tính).

### Các bước khởi chạy:

1.  **Cài đặt thư viện:**
    Mở terminal tại thư mục `BaoDienTuApp` và chạy:
    ```bash
    npm install
    ```

2.  **Cấu hình biến môi trường kết nối Backend:**
    Sao chép tệp `.env.example` thành `.env` tại thư mục gốc của app và chỉnh sửa biến `EXPO_PUBLIC_API_URL` trỏ đến cổng **`8082`** của Backend:
    *   **Nếu dùng máy ảo Android (Emulator):**
        ```env
        EXPO_PUBLIC_API_URL=http://10.0.2.2:8082
        ```
    *   **Nếu dùng thiết bị thật (quét QR):**
        Hãy điền IP mạng cục bộ của máy tính của bạn (đảm bảo máy tính chạy backend và điện thoại bắt chung một sóng Wi-Fi):
        ```env
        EXPO_PUBLIC_API_URL=http://192.168.1.XX:8082
        ```

3.  **Khởi động Metro Bundler:**
    ```bash
    npx expo start
    ```
    *Mẹo: Chạy `npx expo start -c` để xóa bộ nhớ đệm (cache) cũ của Metro nếu gặp lỗi không cập nhật mã nguồn.*

4.  **Mở app:**
    *   **Android:** Mở ứng dụng **Expo Go** trên điện thoại, chọn quét mã QR hiển thị ở terminal.
    *   **iOS:** Dùng camera mặc định của iPhone quét mã QR hiển thị ở terminal, chọn mở liên kết bằng Expo.

---

*Để tìm hiểu sâu hơn về kiến trúc đồng bộ dữ liệu và danh sách API Endpoints chi tiết của dự án, vui lòng đọc [README gốc của dự án](file:///d:/appbao/README.md).*
