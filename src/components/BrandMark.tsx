import React from 'react';

/** Mặt đồng hồ độ (360°): vòng tròn chia 12 vạch và một bán kính đỏ như nét bút chấm bài. */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({ size = 36, className }) => {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const long = i % 3 === 0;
    const r1 = long ? 11.5 : 13.5;
    const r2 = 16;
    return (
      <line
        key={i}
        x1={20 + r1 * Math.sin(a)} y1={20 - r1 * Math.cos(a)}
        x2={20 + r2 * Math.sin(a)} y2={20 - r2 * Math.cos(a)}
        stroke="currentColor" strokeWidth={long ? 1.6 : 1} strokeLinecap="round"
      />
    );
  });
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} role="img" aria-label="Ôn thi Toán 360">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {ticks}
      <line x1="20" y1="20" x2="30.5" y2="9.5" stroke="#e5534b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2.2" fill="#e5534b" />
    </svg>
  );
};

export default BrandMark;
