/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Địa chỉ API khi frontend chạy khác origin. Để trống khi dùng proxy của Vite. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
