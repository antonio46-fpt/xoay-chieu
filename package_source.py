"""Tạo trang đọc mã và ZIP bàn giao từ tệp đã build; không đóng gói dữ liệu cá nhân.

Chạy python build.py và các kiểm thử trước lệnh này.
Chỉ các tệp trong allowlist bên dưới được đưa vào ZIP, không có .git hay credential.
"""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"


def package():
    paths = [
        "CONTRIBUTING.md", "SCOPE.md", "README.md", "MA_NGUON_CHI_TIET.md", "HUONG_DAN_TRIEN_KHAI.md", "DU_LIEU_VA_TAP_HUAN.md",
        "src/app.js", "src/learning.js", "src/core.js", "src/classes.js", "src/safety.js", "src/backup.js", "src/config.js", "src/content.json",
        "src/style.css", "src/shell.html", "apps-script/Code.gs", "apps-script/Accounts.gs", "apps-script/Learning.gs", "apps-script/Management.gs", "apps-script/Schema.gs",
        "apps-script/appsscript.json", "build.py", "package_source.py", "package.json",
        "tests/accounts.cjs", "tests/management.cjs", "tests/minute-sync.cjs", "tests/learning-server.cjs", "tests/learning-ui.cjs", "tests/student-ui.cjs", "tests/logout.cjs", "tests/helpers/sheets.cjs", "tests/backend-review.cjs", "tests/reauth.cjs", "tests/preview.cjs", "tests/fe.cjs", "tests/scope.cjs", "tests/test.cjs", "tests/queue.cjs", "tests/recovery.cjs", "tests/ui.cjs", "tests/run.cjs",
        "tools/source-reader.html", "tools/import_student_roster.py", "tests/roster_import.py", "tests/password-gate.cjs",
        ".github/ISSUE_TEMPLATE/backend_task.yml", "docs/issues/README.md",
        "docs/issues/be-class-roster.md", "docs/issues/be-progress-permissions.md",
        "docs/issues/be-submission-integrity.md", "docs/issues/be-capacity.md",
        "docs/issues/qa-real-devices.md", "docs/issues/ops-legacy-21.md",
        "docs/BACKEND_REVIEW.md", "docs/DEPLOYMENT_CHECKLIST.md", "docs/LOAD_TEST_PLAN.md",
        "docs/QUAN_LY_SHEET.md", "docs/issues/be-minute-management.md", "docs/MA_LOP.md", "docs/TIEN_TRINH_HOC_TAP.md", "docs/HUONG_DAN_HOC_SINH.md", "docs/TAI_KHOAN_HOC_SINH.md",
    ]
    files = {name: (ROOT / name).read_text(encoding="utf-8") for name in paths}
    data = json.dumps(files, ensure_ascii=False).replace("<", "\\u003c")
    reader = (ROOT / "tools/source-reader.html").read_text(encoding="utf-8")
    (DIST / "ma-nguon.html").write_text(reader.replace("/*FILES*/", data), encoding="utf-8")

    paths += ["package-lock.json", "apps-script/Index.html", "dist/index.html", "dist/sw.js", "dist/ma-nguon.html"]
    # Fixed metadata keeps the package reproducible for an unchanged source tree.
    payloads = {name: (ROOT / name).read_bytes() for name in paths}
    payloads["SHA256SUMS.txt"] = ("\n".join(
        hashlib.sha256(data).hexdigest() + "  " + name for name, data in payloads.items()
    ) + "\n").encode()
    target = DIST / "XoayChieu_Source.zip"
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in payloads.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 16, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    print(f"Đã đóng gói {len(payloads)} tệp: {target.name} ({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    package()
