# Kế hoạch: hồ sơ tác giả, hoạt động bình luận và chia sẻ mạng xã hội

> Trạng thái: Bản đề xuất để duyệt, chưa triển khai.
>
> Phạm vi: React Native app `BaoDienTuApp` và Spring Boot backend `Bao-dien-tu-main`. Không thay đổi website quản trị.

## 1. Mục tiêu sản phẩm

1. Người đọc nhấn vào avatar hoặc tên nhà báo trong bài viết để xem hồ sơ và toàn bộ bài đã xuất bản của đúng nhà báo đó.
2. Người đọc nhấn vào avatar hoặc tên một người bình luận để xem hồ sơ công khai, các bình luận của họ và mở lại bài báo chứa từng bình luận.
3. Người đọc có thể chia sẻ bài qua Facebook và các ứng dụng khác bằng luồng chính thức, an toàn.
4. Giao diện giữ chất báo chí cao cấp: dễ đọc, ít màu, không rối và hoạt động tốt ở cả sáng/tối.

## 2. Hiện trạng đã kiểm tra

| Khu vực | Hiện trạng | Khoảng trống |
|---|---|---|
| Avatar nhà báo | App đã điều hướng sang `AuthorDetail` | Danh sách bài đang lọc bằng `authorName`; hai tác giả trùng tên có thể bị gộp |
| API bài của tác giả | Repository đã có truy vấn theo `authorId` | Chưa có API public, phân trang theo `authorId` |
| Bình luận | Backend đã trả `userId` | App đang bỏ `userId` khi ánh xạ dữ liệu, nên chưa thể mở hồ sơ người bình luận |
| Hồ sơ người đọc | Chưa có API public | Cần DTO an toàn và API lịch sử bình luận |
| Quyền bình luận | GET public, POST hiện yêu cầu tài khoản VIP | Cần xác nhận chính sách; đề xuất cho mọi tài khoản đã đăng nhập |
| Chia sẻ | App mới dùng share sheet chung và chưa có URL bài báo | Chưa có nút nền tảng, deep link và URL HTTPS công khai |
| Avatar/bio | Bảng `users` chưa có `avatar_url`, `bio` | Có thể làm bản đầu bằng chữ cái; bổ sung cột ở giai đoạn nâng cao |

## 3. Nguyên tắc bảo mật

- Không tạo trang giả để người dùng nhập tài khoản hoặc mật khẩu Facebook/Google.
- Không thu thập, lưu hoặc chuyển tiếp mật khẩu mạng xã hội.
- Nút Facebook phải mở trang chia sẻ chính thức của Facebook hoặc ứng dụng Facebook. Nếu chưa đăng nhập, Facebook tự hiển thị màn hình đăng nhập chính thức.
- Đăng nhập Google vào chính app, nếu cần, là một tính năng OAuth/OIDC riêng; không phải một phần của chia sẻ Facebook.
- Hồ sơ công khai không trả `email`, `passwordHash`, JWT, trạng thái nội bộ hoặc ngày hết hạn VIP.
- Mật khẩu Azure chỉ đi qua biến môi trường `TMDT_DB_PASSWORD`; không ghi vào plan, source, README hay log.
- Trước khi sửa Azure dùng chung: sao lưu schema, dùng migration cộng thêm và không xóa dữ liệu.

## 4. Thiết kế API backend

### 4.1. Hồ sơ công khai

Thêm endpoint:

```http
GET /api/public/users/{userId}
```

DTO đề xuất:

```json
{
  "id": 21,
  "displayName": "Nguyễn Minh Anh",
  "role": "MEMBER",
  "avatarUrl": null,
  "bio": null,
  "joinedAt": "2026-06-15T08:00:00Z",
  "publishedArticleCount": 0,
  "commentCount": 12
}
```

Quy tắc:

- User không tồn tại hoặc không còn hoạt động: trả `404`.
- Chỉ trả thông tin cần cho giao diện công khai.
- Với `AUTHOR`, trả thêm số bài đã xuất bản.

### 4.2. Danh sách bài của nhà báo

Thêm endpoint ổn định theo ID:

```http
GET /api/public/authors/{authorId}/articles?page=0&size=20&categoryId=
```

Yêu cầu:

- Chỉ lấy bài `PUBLISHED`.
- Sắp xếp mới nhất trước.
- Có phân trang và tổng số bài.
- Trả `categoryId` cùng `categoryName`; `ArticleSearchResponse` hiện còn thiếu `categoryId`.
- Trả `404` nếu user không có vai trò tác giả.
- Tạo index Azure nếu chưa có: `(author_id, status, created_at)`.

Không dùng `authorName` làm khóa vì tên có thể đổi hoặc trùng nhau.

### 4.3. Lịch sử bình luận của người dùng

Thêm endpoint:

```http
GET /api/public/users/{userId}/comments?page=0&size=20
```

Mỗi phần tử gồm bình luận và ngữ cảnh bài báo:

```json
{
  "commentId": 95,
  "content": "Bài viết có số liệu rất rõ ràng.",
  "createdAt": "2026-07-30T09:20:00Z",
  "article": {
    "id": 501,
    "title": "Tiêu đề bài báo",
    "sapo": "Tóm tắt ngắn",
    "coverImage": "https://...",
    "categoryName": "Kinh tế",
    "type": "FREE"
  }
}
```

Yêu cầu:

- Chỉ trả bình luận thuộc bài còn `PUBLISHED`.
- Bình luận mới nhất trước.
- Có phân trang, tránh tải toàn bộ lịch sử.
- Tạo truy vấn fetch DTO trực tiếp để tránh lỗi N+1.
- Tạo index Azure nếu chưa có: `(user_id, created_at)`.

### 4.4. Chính sách gửi bình luận

Đề xuất đổi `requireCurrentVipUser()` thành `requireCurrentUser()`:

- `MEMBER`, `VIP`, `AUTHOR`, `CENSOR`, `ADMIN` đều được bình luận khi đăng nhập.
- Khách chưa đăng nhập chỉ được đọc.
- Giữ validation nội dung: trim, không rỗng, giới hạn độ dài.
- Có thể bổ sung rate limit ở giai đoạn sau để chống spam.

Nếu sản phẩm chủ ý chỉ cho VIP bình luận, UI phải ghi rõ “Bình luận dành cho VIP” thay vì chỉ yêu cầu đăng nhập.

### 4.5. Migration database

Backend đang dùng `ddl-auto: validate`, vì vậy thay đổi schema phải có SQL migration rõ ràng.

Giai đoạn đầu không bắt buộc thay bảng: dùng avatar chữ cái và bio mặc định.

Giai đoạn nâng cao:

```sql
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL;
ALTER TABLE users ADD COLUMN bio VARCHAR(1000) NULL;
CREATE INDEX idx_comments_user_created ON comments(user_id, created_at);
CREATE INDEX idx_articles_author_status_created ON articles(author_id, status, created_at);
```

Trước khi chạy trên Azure cần kiểm tra cột/index đã tồn tại để migration có thể chạy lại an toàn.

## 5. Thiết kế app mobile

### 5.1. Hồ sơ nhà báo

Luồng:

```text
Chi tiết bài báo
  → nhấn avatar/tên tác giả
  → AuthorProfileScreen(authorId)
  → nhấn một bài
  → ArticleDetail(articleId)
```

Giao diện:

- Header phẳng với nút quay lại và tiêu đề “Hồ sơ tác giả”.
- Khối hồ sơ nền trắng/xương ấm, viền 1 px, bo 12 px, không shadow nặng.
- Avatar 72 px, tên dùng serif đậm, badge “NHÀ BÁO” màu pastel xanh nhạt.
- Hiển thị tổng số bài và các chuyên mục nổi bật.
- Thanh lọc chuyên mục dạng chip nhỏ.
- Danh sách bài kiểu editorial: ảnh ấm/desaturated, tiêu đề serif, metadata sans-serif.
- Pull-to-refresh, tải trang tiếp theo, skeleton và trạng thái lỗi/thử lại.
- Dùng `authorId` cho mọi request; `authorName` chỉ dùng hiển thị tạm thời.

### 5.2. Hồ sơ người bình luận

Thêm route:

```ts
ReaderProfile: { userId: number; displayName?: string }
```

Trong `CommentsSection`:

- Hiển thị avatar 36 px bằng ảnh hoặc chữ cái.
- Toàn bộ avatar và tên là vùng bấm tối thiểu 44 px.
- Giữ nội dung bình luận là vùng đọc, không làm cả card thành nút để tránh bấm nhầm.

Màn hình `ReaderProfileScreen`:

- Header hồ sơ công khai với avatar, tên và badge vai trò trung tính.
- Thống kê nhỏ: số bình luận; nếu là tác giả thì có thêm số bài.
- Tiêu đề “Bình luận gần đây”.
- Mỗi mục gồm nội dung bình luận, thời gian, chuyên mục và tiêu đề bài báo.
- Nút rõ ràng “Xem bài viết” mở `ArticleDetail(articleId)`.
- Nếu bài đã gỡ: backend không trả mục đó.
- Empty state: “Người dùng này chưa có bình luận công khai”.

### 5.3. Điều chỉnh model app

- Bổ sung `userId` và `avatarUrl?` vào kiểu `Comment`.
- Giữ `userId` trong `getComments()` và `addComment()`.
- Thêm kiểu `PublicUserProfile`, `CommentActivity`, `PagedResponse<T>`.
- Thêm hàm API:
  - `getPublicUser(userId)`
  - `getUserCommentActivity(userId, page)`
  - `getAuthorArticles(authorId, page, categoryId?)`
- Dùng navigation type cụ thể thay cho `any` ở các màn hình mới.

## 6. Chia sẻ mạng xã hội

### 6.1. Điều kiện bắt buộc

Facebook cần một URL HTTPS công khai để tạo bài chia sẻ và ảnh xem trước. Deep link nội bộ như `baodientu://article/501` không đủ cho người chưa cài app.

Thêm cấu hình:

```env
EXPO_PUBLIC_ARTICLE_WEB_URL=https://<ten-mien-cong-khai>/articles
```

URL chuẩn:

```text
https://<ten-mien-cong-khai>/articles/{articleId}
```

Website hiện có chỉ cần bảo đảm route bài báo này truy cập công khai và có Open Graph metadata (`og:title`, `og:description`, `og:image`). Đây là hạ tầng chia sẻ, không phải xây lại website.

### 6.2. Các nút chia sẻ

Bottom sheet “Chia sẻ bài viết”:

1. **Facebook**
   - Mở URL chính thức:
     `https://www.facebook.com/sharer/sharer.php?u=<encodedArticleUrl>`
   - Dùng trình duyệt hệ thống hoặc ứng dụng Facebook.
   - Nếu người dùng chưa đăng nhập, Facebook tự yêu cầu đăng nhập.

2. **X**
   - Mở intent chính thức với tiêu đề và URL đã encode.

3. **Messenger/Zalo/ứng dụng khác**
   - Dùng share sheet hệ điều hành để hệ thống liệt kê ứng dụng đã cài.
   - Không phụ thuộc deep link không ổn định của từng ứng dụng.

4. **Sao chép liên kết**
   - Chép URL, hiện toast “Đã sao chép liên kết”.

5. **Chia sẻ khác**
   - Giữ `Share.share()` làm fallback.

Không cố điền sẵn nội dung người dùng vào bài đăng Facebook vì nền tảng có thể chặn hành vi này.

### 6.3. Trải nghiệm giao diện

- Dùng bottom sheet nền off-white, viền mảnh, không gradient.
- Icon nền pastel nhỏ; nhãn nền tảng rõ ràng.
- Trạng thái mở link thất bại có toast và tự chuyển sang share sheet.
- Tắt nút Facebook nếu chưa có URL HTTPS hợp lệ.
- Không mở WebView nhúng để nhập mật khẩu; dùng trình duyệt/app chính thức để người dùng nhận biết đúng tên miền.

## 7. Ngôn ngữ thiết kế

Áp dụng phong cách `minimalist-ui`:

- Nền `#F7F6F3` hoặc `#FBFBFA`, card trắng.
- Chữ chính charcoal `#111111`, chữ phụ `#787774`.
- Tiêu đề và tên tác giả dùng serif; metadata và nút dùng sans-serif hệ thống.
- Viền `#EAEAEA`, bo 8–12 px, hầu như không dùng shadow.
- Pastel chỉ dùng cho badge vai trò/chuyên mục.
- Không gradient, neon, glassmorphism hoặc card bo tròn quá mức.
- Chuyển động chỉ dùng opacity/transform, thời lượng ngắn và tôn trọng Reduce Motion.
- Kiểm tra font scaling, dark mode, contrast và vùng bấm tối thiểu 44 px.
- Khi triển khai UI, chuẩn hóa icon mới theo nét dày/filled; cân nhắc chuyển dần từ Lucide hiện tại sang Phosphor để giao diện đồng nhất.

## 8. Thứ tự triển khai đề xuất

### Giai đoạn 0 — An toàn Azure

- Đổi mật khẩu Azure nếu credential thật đã từng được gửi qua chat hoặc log.
- Sao lưu database dùng chung.
- Chạy backend bằng biến môi trường, không commit secret.

### Giai đoạn 1 — Hợp đồng backend

- DTO hồ sơ công khai.
- API tác giả theo `authorId`.
- API lịch sử bình luận có phân trang.
- Điều chỉnh quyền bình luận theo quyết định sản phẩm.
- Repository query, indexes và test backend.

### Giai đoạn 2 — Hồ sơ nhà báo

- Sửa điều hướng dùng ID.
- Làm lại header/profile/list theo thiết kế editorial.
- Phân trang, lọc chuyên mục, refresh và trạng thái lỗi.

### Giai đoạn 3 — Hồ sơ người bình luận

- Giữ `userId` trong model app.
- Avatar/tên bình luận có thể nhấn.
- Màn hình hồ sơ và danh sách bình luận.
- Mở đúng bài báo từ từng bình luận.

### Giai đoạn 4 — Chia sẻ

- Chuẩn hóa URL HTTPS công khai.
- Bottom sheet nền tảng.
- Facebook official sharer, X intent, copy link và share sheet.
- Deep link vào app nếu đã cài và fallback sang trang bài báo.

### Giai đoạn 5 — Kiểm thử và bàn giao

- Backend: repository/service/controller/security tests.
- App: API mapping, navigation và share URL encoding tests.
- Kiểm thử thủ công trên Android thật:
  - cùng mạng với backend;
  - tài khoản chưa/đã đăng nhập;
  - tài khoản MEMBER và VIP;
  - Facebook đã/chưa đăng nhập;
  - app chia sẻ đích đã/chưa cài.
- Chạy `mvnw.cmd test`, TypeScript, ESLint, Jest, Android/iOS bundle và build APK.

## 9. Tiêu chí nghiệm thu

- Hai tác giả trùng tên vẫn mở đúng danh sách bài nhờ `authorId`.
- Nhấn avatar/tên nhà báo từ bài viết mở hồ sơ trong một thao tác.
- Nhấn avatar/tên người bình luận mở đúng hồ sơ bằng `userId`.
- Mỗi bình luận trong hồ sơ mở được đúng bài báo liên quan.
- Không endpoint công khai nào làm lộ email hoặc thông tin xác thực.
- Danh sách lớn có phân trang, không tạo truy vấn N+1.
- Facebook mở đúng tên miền chính thức và không có màn hình nhập mật khẩu do app tự dựng.
- Share fallback vẫn hoạt động khi Facebook/X không cài.
- Giao diện sáng/tối rõ ràng, không lỗi font scaling hoặc vùng bấm nhỏ.
- Backend và app vượt qua toàn bộ test/build trước khi cập nhật APK.

## 10. Các quyết định cần duyệt

1. **Ai được bình luận?** Đề xuất: mọi tài khoản đã đăng nhập, không giới hạn VIP.
2. **Hồ sơ người đọc có công khai lịch sử bình luận không?** Đề xuất: có, nhưng chỉ tên hiển thị và hoạt động công khai; không email.
3. **Nền tảng chia sẻ bản đầu:** Đề xuất Facebook, X, sao chép liên kết và share sheet; Messenger/Zalo đi qua share sheet.
4. **Avatar/bio:** Đề xuất bản đầu dùng avatar chữ cái; bổ sung upload/avatar URL và bio sau khi API cốt lõi ổn định.
5. **URL bài báo công khai:** Cần xác nhận tên miền frontend hiện có để Facebook tạo preview.
