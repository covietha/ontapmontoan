import React from 'react';

/** Huy hiệu trường THPT Trần Hưng Đạo (đã cắt sát vòng tròn, nền trong suốt). */
export const BrandMark: React.FC<{ size?: number; className?: string; glow?: boolean }> = ({ size = 40, className = '', glow = false }) => (
  <img
    src={size > 96 ? '/brand/logo-512.png' : '/brand/logo-192.png'}
    width={size}
    height={size}
    alt="Huy hiệu trường THPT Trần Hưng Đạo"
    draggable={false}
    className={`rounded-full select-none shrink-0 ${glow ? 'logo-glow' : ''} ${className}`}
    style={{ width: size, height: size }}
  />
);

export default BrandMark;
