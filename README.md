# NewsDaily

Ứng dụng đọc báo di động viết bằng React Native 0.81 và Expo SDK 54. Ứng dụng có luồng đọc tin công khai, tìm kiếm theo chuyên mục, bài VIP, bình luận, bài đã lưu, đọc ngoại tuyến, đọc thành tiếng, lịch và thời tiết.

## Cấu hình

Yêu cầu Node.js 22+, Android Studio/JDK 17 cho Android và Xcode/CocoaPods cho iOS.

Sao chép `.env.example` thành `.env`, sau đó thay địa chỉ bằng URL của backend:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:8082
```

Với thiết bị thật, máy chạy backend và điện thoại phải truy cập được cùng địa chỉ mạng. Với Android Emulator và backend chạy trên máy phát triển, có thể dùng `http://10.0.2.2:8082`.

## Chạy ứng dụng

```sh
npm install
npm start
```

Ở terminal khác:

```sh
npm run android
```

Trên macOS, cài pods trước khi chạy iOS:

```sh
cd ios
bundle exec pod install
cd ..
npm run ios
```

## Kiểm tra chất lượng

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo install --check
```

Build APK debug:

```sh
cd android
gradlew.bat assembleDebug
```

APK được tạo tại `android/app/build/outputs/apk/debug/app-debug.apk`. Đây là bản phát triển và cần Metro khi chạy; bản phát hành cần thêm keystore/signing riêng.

## Lưu ý tích hợp backend

- JWT được giữ trong SecureStore; metadata hồ sơ và thiết lập giao diện nằm trong AsyncStorage. Avatar được lưu theo tài khoản trên backend và được khôi phục khi đăng nhập lại.
- Phía ứng dụng chỉ mở URL thanh toán do API trả về. Quyền VIP phải được backend kích hoạt sau callback thanh toán thành công.
- API thời tiết/AQI dùng Open-Meteo; định vị chỉ được hỏi khi người dùng bật vị trí tự động.
- Bài tải ngoại tuyến lưu phần chữ trên thiết bị và không tải ảnh từ mạng khi mở ở chế độ ngoại tuyến.
- Trung tâm thông báo trong app lấy dữ liệu từ `/api/me/notifications`. Người dùng phải đăng nhập và chọn chủ đề quan tâm; bản hiện tại chưa gửi push notification ra thanh trạng thái hệ điều hành.
- Tính năng nghe bài dùng giọng đọc có sẵn trên thiết bị. Trên Android, nếu chưa có giọng Việt, mở `Cài đặt > Văn bản sang giọng nói`, chọn Speech Services by Google và tải dữ liệu tiếng Việt.

## Không gian tác nghiệp

Ứng dụng tự hiển thị khu vực tác nghiệp trong trang Cá nhân theo role của JWT:

- `AUTHOR`: xem bài theo trạng thái, soạn bài, lưu nháp, xem trước và gửi duyệt.
- `CENSOR`: đọc toàn bộ bài đang chờ, duyệt hoặc trả lại kèm lý do.
- `ADMIN`: có quyền kiểm duyệt, ẩn/hiện bài và quản lý role/trạng thái tài khoản.

Ảnh bìa có thể được chọn trực tiếp từ điện thoại hoặc nhập bằng URL công khai. Ảnh tải từ điện thoại được gửi tới `/api/media` và lưu trong kho dữ liệu dùng chung của backend; giới hạn 5 MB, hỗ trợ JPEG, PNG và WebP.
