import { useEffect, useState } from 'react';

const KHOA = 'xoaychieu_theme';

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

/** Nút đổi nền sáng / tối. */
export default function ThemeToggle(): JSX.Element {
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    const banDau = docThemeBanDau();
    setDark(banDau);
    apDungTheme(banDau);
  }, []);

  function doi(): void {
    const moi = !dark;
    setDark(moi);
    apDungTheme(moi);
    localStorage.setItem(KHOA, moi ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      onClick={doi}
      aria-label={dark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
      title={dark ? 'Nền sáng' : 'Nền tối'}
      className="grid h-9 w-9 place-items-center rounded-lg border border-ink/15 bg-white/70 text-[15px] text-ink transition hover:border-primary/50 hover:text-primary"
    >
      <span aria-hidden>{dark ? '☀' : '☾'}</span>
    </button>
  );
}
