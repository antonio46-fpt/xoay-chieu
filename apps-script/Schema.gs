// Tự sinh bởi build.py từ src/content.json; không sửa trực tiếp.
const SCHEMA = {
  "schools": [
    {
      "truong": "THPT Chuyên Chu Văn An",
      "lop": [
        "10 Trung",
        "10D2"
      ]
    },
    {
      "truong": "THPT Dân tộc nội trú tỉnh",
      "lop": [
        "10A6",
        "10A7"
      ]
    }
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
