import { useEffect, useState } from 'react';

const KHOA = 'xoaychieu_theme';

/** Áp hoặc gỡ class .dark trên thẻ html. */
export function apDungTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
}

/** Đọc lựa chọn đã lưu, hoặc theo cài đặt hệ điều hành. */
export function docThemeBanDau(): boolean {
  const daLuu = localStorage.getItem(KHOA);
  if (daLuu === 'dark') return true;
  if (daLuu === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Trạng thái giao diện sáng/tối.
 *
 * Nhiều component cùng dùng (menu người dùng, có thể cả trang khác) nên tách
 * thành hook riêng, dùng một khoá localStorage chung.
 */
export function useTheme(): { dark: boolean; doi: () => void } {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const banDau = docThemeBanDau();
    setDark(banDau);
    apDungTheme(banDau);
  }, []);

  function doi(): void {
    setDark(v => {
      const moi = !v;
      apDungTheme(moi);
      localStorage.setItem(KHOA, moi ? 'dark' : 'light');
      return moi;
    });
  }

  return { dark, doi };
}
