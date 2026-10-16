"""Ghép app HTML độc lập và schema Google Apps Script từ cùng nội dung JSON.

Chỉ dùng Python standard library; không cần npm để build hoặc chạy app.
Sửa trong src/, không sửa trực tiếp các tệp đầu ra.
"""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
SERVER = ROOT / "apps-script"


def read(path):
    return path.read_text(encoding="utf-8")


def validate_content(content):
    """Bắt lỗi cấu hình trước khi tạo hai bản frontend/backend."""
    assert content["so_tuan"] == len(content["weeks"]) == 4, "Cần đủ 4 tuần"
    assert [week["tuan"] for week in content["weeks"]] == [1, 2, 3, 4]
    for week in content["weeks"]:
        stages = {}
        fields = []
        for step in week["steps"]:
            if step["stage"] in stages:
                assert stages[step["stage"]] == step["minutes"], "Thời lượng chặng bị lệch"
            stages[step["stage"]] = step["minutes"]
            for field in step["fields"]:
                fields.append(field["key"])
                assert field["max"] >= field["min"] >= 0
        assert sum(stages.values()) == week["duration"], (week["tuan"], stages)
        assert week["duration"] == (15 if week["tuan"] <= 2 else 45)
        assert len(fields) == len(set(fields)), "Trùng khóa câu trả lời"
        assert fields.count("tu_danh_gia") == 1, "Mỗi tuần cần một tự đánh giá"


def build():
    content = json.loads(read(SRC / "content.json"))
    validate_content(content)
    DIST.mkdir(exist_ok=True)
    SERVER.mkdir(exist_ok=True)

    # Escape '<' trong JSON để một lá thư có </script> không đóng thẻ script.
    data_js = "const CONTENT = " + json.dumps(content, ensure_ascii=False).replace("<", "\\u003c") + ";"
    sections = {
        "CSS": read(SRC / "style.css"),
        "CONFIG": read(SRC / "config.js"),
        "DATA": data_js,
        "CORE": read(SRC / "core.js"),
        "BACKUP": read(SRC / "backup.js"),
        "APP": read(SRC / "app.js"),
    }
    html = read(SRC / "shell.html")
    for name, source in sections.items():
        marker = "/*" + name + "*/"
        assert html.count(marker) == 1, "Sai placeholder " + name
        html = html.replace(marker, source)
    (DIST / "index.html").write_text(html, encoding="utf-8")
    (SERVER / "Index.html").write_text(html, encoding="utf-8")

    # Cùng định nghĩa ô nhập cho kiểm tra cả phía học sinh và máy chủ.
    schema = {
        "schools": content["truong_lop"],
        "weeks": [[field for step in week["steps"] for field in step["fields"]]
                  for week in content["weeks"]],
    }
    (SERVER / "Schema.gs").write_text(
        "// Tự sinh bởi build.py từ src/content.json; không sửa trực tiếp.\n"
        + "const SCHEMA = " + json.dumps(schema, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    version = hashlib.sha256(html.encode()).hexdigest()[:12]
    # Cache shell cho bản tĩnh HTTP(S). Apps Script không dùng service worker này.
    sw = "const CACHE = 'xc-" + version + "';\n" + """
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['./', './index.html'])));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('xc-') && key !== CACHE).map(key => caches.delete(key))
  )));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(
    response => response || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
  )));
});
"""
    (DIST / "sw.js").write_text(sw, encoding="utf-8")
    print("Đã build HTML, schema và cache:", version)


if __name__ == "__main__":
    build()
