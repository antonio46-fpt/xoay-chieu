import { useMemo } from 'react';

/**
 * Sao vàng rơi tự do trên nền.
 *
 * Mỗi ngôi sao có vị trí ngang, kích thước, thời lượng và độ trễ riêng nên
 * rơi lệch nhau tự nhiên. Hoạt ảnh chạy bằng CSS, không có vòng lặp JS.
 * Toàn bộ lớp phủ không nhận sự kiện chuột.
 */
export default function StarFall({ soLuong = 16 }: { soLuong?: number }): JSX.Element {
  const sao = useMemo(
    () =>
      Array.from({ length: soLuong }, (_, i) => {
        const lon = 6 + Math.random() * 12;
        return {
          id: i,
          x: Math.random() * 100,
          size: lon,
          duration: 9 + Math.random() * 10,
          delay: -Math.random() * 18,
          sway: (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 50),
          opacity: 0.55 + Math.random() * 0.4
        };
      }),
    [soLuong]
  );

  return (
    <div className="star-fall" aria-hidden>
      {sao.map(s => (
        <i
          key={s.id}
          style={
            {
              '--x': `${s.x}%`,
              '--s': `${s.size}px`,
              '--d': `${s.duration}s`,
              '--delay': `${s.delay}s`,
              '--sway': `${s.sway}px`,
              '--o': s.opacity
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
