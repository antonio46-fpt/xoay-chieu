"""Tạo báo cáo sản phẩm Xoay Chiều 3.0.0 kèm ảnh minh chứng chụp từ web thật."""
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor

GOC = Path(__file__).resolve().parent.parent
ANH = GOC / "docs" / "evidence"
RA = GOC / "docs" / "BAO_CAO_SAN_PHAM_Xoay_Chieu_3.0.docx"

MAU_CHINH = RGBColor(0x0F, 0x4C, 0x5C)
MAU_NHAT = RGBColor(0x64, 0x74, 0x8B)

doc = Document()

# Khổ A4, lề 2 cm
for section in doc.sections:
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)

style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)
style.paragraph_format.space_after = Pt(6)
style.paragraph_format.line_spacing = 1.15


def tieu_de(text: str) -> None:
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.size = Pt(20)
    r.font.bold = True
    r.font.color.rgb = MAU_CHINH
    p.paragraph_format.space_after = Pt(4)


def phu_de(text: str) -> None:
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.size = Pt(11)
    r.font.italic = True
    r.font.color.rgb = MAU_NHAT


def muc(text: str) -> None:
    p = doc.add_heading(level=1)
    r = p.add_run(text)
    r.font.size = Pt(14)
    r.font.color.rgb = MAU_CHINH
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)


def doan(text: str) -> None:
    doc.add_paragraph(text)


def gach_dau(text: str) -> None:
    doc.add_paragraph(text, style="List Bullet")


def anh(path: Path, chu_thich: str) -> None:
    if not path.exists():
        doan(f"[Thiếu ảnh: {path.name}]")
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(path), width=Cm(16.5))
    p.paragraph_format.space_after = Pt(2)

    c = doc.add_paragraph()
    c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = c.add_run(chu_thich)
    r.font.size = Pt(9)
    r.font.italic = True
    r.font.color.rgb = MAU_NHAT
    c.paragraph_format.space_after = Pt(12)


# ------------------------------------------------------------------ trang bìa
tieu_de("XOAY CHIỀU 3.0.0")
phu_de("Hệ thống tổ chức hoạt động học tập bốn tuần và thu dữ liệu nghiên cứu")
doc.add_paragraph()

doan(
    "Xoay Chiều là ứng dụng web chạy thật, không phải bản mô phỏng: giao diện React, "
    "máy chủ Fastify, cơ sở dữ liệu PostgreSQL, đăng nhập bằng tài khoản và mật khẩu. "
    "Học sinh làm bốn tuần hoạt động ngắn, hệ thống lưu bài viết, che nội dung nhạy cảm "
    "ở phía máy chủ, và chuyển toàn bộ dữ liệu về một nơi cho nhóm nghiên cứu phân tích."
)
doan(
    "Hệ thống không chấm điểm, không xếp hạng, không dùng AI đánh giá bài làm. "
    "Nó chỉ tổ chức hoạt động và giữ lại những gì học sinh viết."
)

muc("Thông tin truy cập để kiểm chứng")
bang = doc.add_table(rows=1, cols=2)
bang.style = "Light Grid Accent 1"
bang.alignment = WD_TABLE_ALIGNMENT.CENTER
hang = bang.rows[0].cells
hang[0].text = "Hạng mục"
hang[1].text = "Giá trị"
for nhan, gia_tri in [
    ("Địa chỉ web", "localhost:5173 — bản chạy thử nội bộ"),
    ("Tài khoản học sinh", "hs01 / Demo12345"),
    ("Tài khoản quản trị", "admin / Demo12345"),
    ("Khu quản trị", "localhost:5173/admin"),
]:
    o = bang.add_row().cells
    o[0].text = nhan
    o[1].text = gia_tri

doc.add_page_break()

# --------------------------------------------------------- 1. ảnh minh chứng
muc("1. Ảnh minh chứng — chụp trực tiếp từ web đang chạy")
doan(
    "Toàn bộ ảnh dưới đây được chụp bằng trình duyệt tự động (Chrome, chế độ ẩn) "
    "truy cập chính ứng dụng đang chạy, không qua chỉnh sửa."
)

anh(ANH / "01-dang-nhap.png", "Ảnh 1. Trang đăng nhập: hai cột, nền trời sao, chong chóng quay.")
anh(
    ANH / "02-dashboard-hoc-sinh.png",
    "Ảnh 2. Trang chủ học sinh: bốn thẻ tiến độ, danh sách bốn tuần với trạng thái thật từ máy chủ.",
)
anh(
    ANH / "03-lam-bai-tuan-1.png",
    "Ảnh 3. Màn hình làm bài tuần 1: lá thư mở tuần, chín bước, tự lưu bản nháp sau 1,2 giây.",
)
anh(
    ANH / "04-admin-tong-quan.png",
    "Ảnh 4. Trang quản trị — tổng quan: số học sinh, tỉ lệ hoàn thành, tiến độ từng tuần.",
)
anh(ANH / "05-admin-hoc-sinh.png", "Ảnh 5. Quản lý học sinh: tìm kiếm, lọc lớp, tiến độ bốn tuần, cấp lại mật khẩu.")
anh(ANH / "06-admin-bai-nop.png", "Ảnh 6. Theo dõi bài nộp: lọc theo tuần, xem chi tiết từng học sinh.")
anh(ANH / "07-admin-noi-dung.png", "Ảnh 7. Sửa nội dung bốn tuần: đề bài, lời dẫn, gợi ý — lưu thẳng vào cơ sở dữ liệu.")

doc.add_page_break()

# ------------------------------------------------------------- 2. tính năng
muc("2. Ứng dụng làm được gì")
doan("Phía học sinh:")
for t in [
    "Đăng nhập bằng tài khoản do giáo viên cấp; bắt buộc đổi mật khẩu ở lần đầu.",
    "Trang chủ hiển thị tiến độ bốn tuần: đã nộp, đang làm, chưa bắt đầu.",
    "Mỗi tuần gồm 9–11 bước: đọc thư mở tuần, trả lời câu hỏi, viết sản phẩm, tự đánh giá.",
    "Bản nháp tự lưu sau 1,2 giây ngừng gõ; mất mạng vẫn không mất bài.",
    "Bài đã nộp không sửa được; muốn làm lại phải chọn “Làm lượt mới”.",
]:
    gach_dau(t)

doan("Phía quản trị:")
for t in [
    "Tổng quan toàn hệ thống: số trường, lớp, học sinh, bài nộp, tỉ lệ hoàn thành.",
    "Quản lý tài khoản: tạo mới, cấp lại mật khẩu, khoá hoặc mở khoá, nhập và xuất CSV.",
    "Theo dõi bài nộp theo tuần, xem chi tiết nội dung từng học sinh đã viết.",
    "Sửa nội dung bốn tuần ngay trên web, có nút khôi phục về bản gốc.",
]:
    gach_dau(t)

muc("3. Công nghệ sử dụng")
bang2 = doc.add_table(rows=1, cols=2)
bang2.style = "Light Grid Accent 1"
hd = bang2.rows[0].cells
hd[0].text = "Thành phần"
hd[1].text = "Công nghệ"
for a, b in [
    ("Giao diện", "React 18, TypeScript, Vite, Tailwind CSS"),
    ("Máy chủ", "Node.js, Fastify 5, TypeScript"),
    ("Cơ sở dữ liệu", "PostgreSQL 16, 17 bảng, có trigger bảo vệ dữ liệu"),
    ("Xác thực", "Cookie httpOnly, mật khẩu băm Argon2id"),
    ("Kiểm thử", "66 test tự động, gồm 5 test tấn công bảo mật"),
    ("Triển khai", "Nginx + PM2, CI/CD bằng GitHub Actions"),
]:
    o = bang2.add_row().cells
    o[0].text = a
    o[1].text = b

muc("4. Bảo mật")
for t in [
    "Toàn bộ truy vấn dùng tham số hoá, không nối chuỗi SQL.",
    "Mật khẩu băm Argon2id; cơ sở dữ liệu chỉ lưu băm của phiên đăng nhập.",
    "Học sinh không gọi được API quản trị; giáo viên không đọc được nội dung bài làm.",
    "Nội dung nhạy cảm được che ở máy chủ, không phải ở giao diện.",
    "Bài nộp bất biến ở tầng cơ sở dữ liệu bằng trigger.",
]:
    gach_dau(t)

muc("5. Trạng thái hiện tại")
for t in [
    "Đã xong: đăng nhập, bốn tuần hoạt động, xem lại bài, đổi mật khẩu, toàn bộ trang quản trị.",
    "Đang làm: trang giáo viên (máy chủ đã có API, chưa có giao diện).",
    "Chưa làm: triển khai lên máy chủ thật có tên miền.",
]:
    gach_dau(t)

doan(
    "Lưu ý khi kiểm thử: dữ liệu hiện là dữ liệu mẫu (55 tài khoản, 1 bài nộp), "
    "mật khẩu chung Demo12345. Trước khi dùng với học sinh thật phải đặt lại toàn bộ mật khẩu."
)

doc.save(RA)
print("da tao:", RA)
print("so doan:", len(doc.paragraphs), "| so bang:", len(doc.tables))
