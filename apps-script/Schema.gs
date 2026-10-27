// Tự sinh bởi build.py; không sửa trực tiếp.
/** Chính sách dùng chung trước khi gửi và trước khi ghi Sheet. Không sửa bản gốc trên máy. */
const Safety = (() => {
  const hidden = '[đã ẩn – an toàn]';
  const normalize = value => String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .replace(/[\u200b-\u200d\ufeff]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function matches(value, config) {
    const text = normalize(value);
    return (config?.tu_khoa || []).some(word => normalize(word) && text.includes(normalize(word)));
  }
  function redactRecord(record, config) {
    const result = { ...record };
    const fields = record.loai === 'chu_trinh' ?
      ['thu_lam', 'nghi_1', 'nghi_2', 'nghi_3', 'noi', 'san_pham', 'chia_se', 'kiem_soat', 'ngoai_kiem_soat'] :
      record.loai === 'phieu_buoi' ? ['khung_gio', 'dieu_tot', 'kho_khan', 'dieu_phoi_vien_viet_tat'] :
      ['nhom', 'vi_sao'];
    fields.forEach(key => {
      if (typeof result[key] === 'string' && matches(result[key], config)) result[key] = hidden;
    });
    // Giữ quy tắc ánh xạ, đồng thời tránh rò nội dung qua cột tổng hợp.
    if (record.loai === 'chu_trinh' && record.tuan === 3) {
      if (result.nghi_1 === hidden) result.nghi_1 = (String(record.phe).startsWith('A') ? 'Phe A: ' : 'Phe B: ') + hidden;
      if (result.chia_se === hidden) result.chia_se = record.doi_hay_giu + ': ' + hidden;
    }
    if (record.loai === 'chu_trinh' && record.tuan === 4) {
      result.thu_lam = 'Phần mình thay đổi được:\n' + result.kiem_soat +
        '\n\nPhần mình không thay đổi được:\n' + result.ngoai_kiem_soat;
    }
    return result;
  }
  return { hidden, matches, redactRecord };
})();
if (typeof module !== 'undefined') module.exports = Safety;

/** Mã dữ liệu và nhãn hiển thị. Chỉ các bí danh liệt kê chính xác mới được quy đổi. */
const ClassIds = (() => {
  const labels = {'10A3':'10A3 (10 Tin)','11E1':'11E1 (11 Văn)','LB-11A':'LB-11A (11A Lộc Bình)'};
  const code = value => Object.keys(labels).find(key => labels[key] === value) || value;
  const label = value => labels[code(value)] || value;
  const profile = value => value && typeof value === 'object' ? {...value,lop:code(value.lop)} : value;
  // Khóa trên máy giữ nguyên để không tách hồ sơ đã lưu trước 2.7.1. Không gửi khóa này lên Sheet.
  const storageKey = value => JSON.stringify([value.truong,label(value.lop),value.ma]);
  return {code,label,profile,storageKey};
})();
if (typeof module !== 'undefined') module.exports = ClassIds;

const SCHEMA = {
  "cellMax": 13000,
  "schools": [
    {
      "truong": "THPT Chuyên Chu Văn An",
      "lop": [
        "10A3",
        "11E1"
      ]
    },
    {
      "truong": "Trường PTDTNT THCS & THPT Lộc Bình",
      "lop": [
        "LB-11A"
      ]
    },
    {
      "truong": "THPT Chi Lăng",
      "lop": [
        "12A2"
      ]
    }
  ],
  "safety": {
    "tu_khoa": [
      "muốn chết",
      "tự tử",
      "không muốn sống",
      "tự làm đau",
      "tự làm hại",
      "bị đánh",
      "bị bắt nạt",
      "bị đe dọa"
    ],
    "loi_nhan": "Cảm ơn bạn đã chia sẻ. Điều bạn đang gặp rất quan trọng. Hãy nói chuyện ngay với thầy cô chủ nhiệm hoặc cán bộ tư vấn học đường của trường – bạn không phải tự mình vượt qua một mình. Phần trả lời có từ khóa sẽ được thay bằng “[đã ẩn – an toàn]” khi gửi; bản gốc vẫn nằm trên máy và trong bản sao bạn tải về.",
    "lien_he": ""
  },
  "workflow": [
    [
      {
        "stage": "Mở thư",
        "hints": 0
      },
      {
        "stage": "Thử",
        "hints": 0
      },
      {
        "stage": "Nghĩ",
        "hints": 3
      },
      {
        "stage": "Nghĩ",
        "hints": 3
      },
      {
        "stage": "Nghĩ",
        "hints": 3
      },
      {
        "stage": "Nối",
        "hints": 0
      },
      {
        "stage": "Nối",
        "hints": 0
      },
      {
        "stage": "Chia sẻ",
        "hints": 0
      },
      {
        "stage": "Tự đánh giá",
        "hints": 0
      }
    ],
    [
      {
        "stage": "Mở thư",
        "hints": 0
      },
      {
        "stage": "Thử",
        "hints": 0
      },
      {
        "stage": "Nghĩ",
        "hints": 3
      },
      {
        "stage": "Nghĩ",
        "hints": 3
      },
      {
        "stage": "Nghĩ",
        "hints": 3
      },
      {
        "stage": "Nối",
        "hints": 0
      },
      {
        "stage": "Nối",
        "hints": 0
      },
      {
        "stage": "Chia sẻ",
        "hints": 0
      },
      {
        "stage": "Tự đánh giá",
        "hints": 0
      }
    ],
    [
      {
        "stage": "Mở thư",
        "hints": 0
      },
      {
        "stage": "Thử",
        "hints": 0
      },
      {
        "stage": "Chuẩn bị",
        "hints": 3
      },
      {
        "stage": "Trình bày",
        "hints": 0
      },
      {
        "stage": "Đổi phe",
        "hints": 3
      },
      {
        "stage": "Bỏ phe",
        "hints": 3
      },
      {
        "stage": "Sản phẩm",
        "hints": 0
      },
      {
        "stage": "Sản phẩm",
        "hints": 0
      },
      {
        "stage": "Sản phẩm",
        "hints": 0
      },
      {
        "stage": "Chia sẻ",
        "hints": 0
      },
      {
        "stage": "Tự đánh giá",
        "hints": 0
      }
    ],
    [
      {
        "stage": "Nhìn lại",
        "hints": 0
      },
      {
        "stage": "Nhìn lại",
        "hints": 0
      },
      {
        "stage": "Nhìn lại",
        "hints": 3
      },
      {
        "stage": "Phòng tranh",
        "hints": 0
      },
      {
        "stage": "Phòng tranh",
        "hints": 0
      },
      {
        "stage": "Viết thư",
        "hints": 3
      },
      {
        "stage": "Tổng kết",
        "hints": 3
      },
      {
        "stage": "Tổng kết",
        "hints": 0
      },
      {
        "stage": "Tự đánh giá",
        "hints": 0
      }
    ]
  ],
  "weeks": [
    [
      {
        "key": "thu_lam",
        "label": "Mình đã thử thế nào?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_1",
        "label": "Câu trả lời của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_2",
        "label": "Câu trả lời của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_3",
        "label": "Câu trả lời của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "noi",
        "label": "Điều mình liên hệ được",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "dang_san_pham",
        "label": "Chọn dạng sản phẩm",
        "min": 0,
        "kind": "select",
        "max": 6000,
        "options": [
          "Thơ 4 câu",
          "Tranh 4 khung",
          "Sơ đồ hình ảnh",
          "Nhịp đọc / rap ngắn",
          "Tiểu phẩm 1 phút",
          "Lời then / sli / lượn",
          "Họa tiết thổ cẩm",
          "Ảnh có chú thích"
        ]
      },
      {
        "key": "san_pham",
        "label": "Viết bài thơ hoặc mô tả sản phẩm của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "chia_se",
        "label": "Điều mình vừa nghe được từ bạn",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "tu_danh_gia",
        "label": "Mức tự đánh giá",
        "min": 0,
        "kind": "rating",
        "max": 6000
      }
    ],
    [
      {
        "key": "thu_lam",
        "label": "Mình đã thử hai cách như thế nào?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_1",
        "label": "Câu trả lời của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_2",
        "label": "Câu trả lời của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_3",
        "label": "Câu trả lời của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "noi",
        "label": "Trải nghiệm mình liên hệ được",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "dang_san_pham",
        "label": "Chọn dạng sản phẩm",
        "min": 0,
        "kind": "select",
        "max": 6000,
        "options": [
          "Thơ 4 câu",
          "Tranh 4 khung",
          "Sơ đồ hình ảnh",
          "Nhịp đọc / rap ngắn",
          "Tiểu phẩm 1 phút",
          "Lời then / sli / lượn",
          "Họa tiết thổ cẩm",
          "Ảnh có chú thích"
        ]
      },
      {
        "key": "san_pham",
        "label": "Mô tả 4 khung hoặc viết sản phẩm của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "chia_se",
        "label": "Điều mình nghe được từ bạn",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "tu_danh_gia",
        "label": "Mức tự đánh giá",
        "min": 0,
        "kind": "rating",
        "max": 6000
      }
    ],
    [
      {
        "key": "thu_lam",
        "label": "Bạn đoán đúng đến đâu? Điều gì làm bạn đoán sai?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "phe",
        "label": "Phe của mình",
        "min": 0,
        "kind": "select",
        "max": 6000,
        "options": [
          "A — Đồng ý",
          "B — Không đồng ý"
        ]
      },
      {
        "key": "nghi_1",
        "label": "Hai lý do và ví dụ của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_2",
        "label": "Lý lẽ mạnh nhất của họ là gì? Viết bằng lời của bạn.",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_3",
        "label": "Hai phe đồng ý ở đâu? Điều gì bạn vẫn chưa chắc?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "doi_hay_giu",
        "label": "Lựa chọn của mình",
        "min": 0,
        "kind": "select",
        "max": 6000,
        "options": [
          "Đổi ý",
          "Giữ ý"
        ]
      },
      {
        "key": "chia_se",
        "label": "Vì sao mình đổi hoặc giữ ý?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "noi",
        "label": "Liên hệ với môn học hoặc đời sống",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "dang_san_pham",
        "label": "Chọn dạng sản phẩm",
        "min": 0,
        "kind": "select",
        "max": 6000,
        "options": [
          "Thơ 4 câu",
          "Tranh 4 khung",
          "Sơ đồ hình ảnh",
          "Nhịp đọc / rap ngắn",
          "Tiểu phẩm 1 phút",
          "Lời then / sli / lượn",
          "Họa tiết thổ cẩm",
          "Ảnh có chú thích"
        ]
      },
      {
        "key": "san_pham",
        "label": "Nội dung sản phẩm của mình",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "tu_danh_gia",
        "label": "Mức tự đánh giá",
        "min": 0,
        "kind": "rating",
        "max": 6000
      }
    ],
    [
      {
        "key": "kiem_soat",
        "label": "Phần mình thay đổi hoặc tác động được",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "ngoai_kiem_soat",
        "label": "Phần mình không tự quyết định được",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_1",
        "label": "Mình sẽ bắt đầu bằng việc gì?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "dang_san_pham",
        "label": "Chọn dạng sản phẩm",
        "min": 0,
        "kind": "select",
        "max": 6000,
        "options": [
          "Thơ 4 câu",
          "Tranh 4 khung",
          "Sơ đồ hình ảnh",
          "Nhịp đọc / rap ngắn",
          "Tiểu phẩm 1 phút",
          "Lời then / sli / lượn",
          "Họa tiết thổ cẩm",
          "Ảnh có chú thích"
        ]
      },
      {
        "key": "san_pham",
        "label": "Viết phiên bản đã sửa của sản phẩm",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "chia_se",
        "label": "Một sản phẩm của bạn khác khiến mình học được gì?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_2",
        "label": "Lá thư của mình",
        "min": 30,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "nghi_3",
        "label": "Thói quen học mình muốn giữ lại là gì? Vì sao?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "noi",
        "label": "Mình sẽ áp dụng ở đâu và như thế nào?",
        "min": 5,
        "kind": "text",
        "max": 6000
      },
      {
        "key": "tu_danh_gia",
        "label": "Mức tự đánh giá",
        "min": 0,
        "kind": "rating",
        "max": 6000
      }
    ]
  ]
};
