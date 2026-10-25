import React from 'react';

/**
 * Hai học sinh THPT (một nam, một nữ) mặc đồng phục áo trắng, cùng luyện đề trên máy tính.
 * Hình vẽ gốc bằng SVG, nhìn nghiêng hai bên, màn hình ở giữa.
 */
const SKIN = '#f1c7a2';
const SKIN_SHADE = '#e0ae86';
const HAIR = '#1a1a24';

const Student: React.FC<{ girl?: boolean }> = ({ girl }) => (
  <g>
    {/* ghế */}
    <rect x="-62" y="38" width="96" height="90" rx="22" fill="#26365f" />
    {/* cổ */}
    <path d="M-9 20h18v28h-18z" fill={SKIN_SHADE} />
    {/* tóc dài phía sau của bạn nữ */}
    {girl && <path d="M-26 -6C-44 20 -40 56 -22 70C-12 56 -12 30 -14 8Z" fill={HAIR} />}
    {/* thân áo trắng */}
    <path d="M-52 128C-54 84 -38 52 -10 46L12 46C38 50 54 76 58 128Z" fill="#f8fafc" />
    <path d="M-10 46L3 66L14 46Z" fill="#dbe3ee" />
    {/* huy hiệu nhỏ trên ngực áo */}
    <circle cx="30" cy="84" r="5" fill="#e8430f" />
    <circle cx="30" cy="84" r="2" fill="#fff" />
    {/* đầu */}
    <ellipse cx="0" cy="0" rx="24" ry="28" fill={SKIN} />
    <ellipse cx="-9" cy="3" rx="4.5" ry="6.5" fill={SKIN_SHADE} />
    <path d="M23 2q6 3 0 8" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.2" strokeLinecap="round" />
    {/* tóc */}
    <path
      d={girl
        ? 'M-27 2C-34-34-6-42 12-35C27-30 29-16 25-10C14-22 4-22-5-15C-10-9-12-2-27 8Z'
        : 'M-27 0C-32-34-6-41 12-35C26-31 28-18 24-12C14-23 4-24-6-17C-10-10-12-4-27 6Z'}
      fill={HAIR}
    />
    {girl && <circle cx="-26" cy="-14" r="7" fill={HAIR} />}
    {/* mắt, lông mày, miệng */}
    <circle cx="13" cy="-3" r="2.3" fill="#2b2118" />
    <path d="M7 -10q6 -3 12 0" stroke={HAIR} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M12 14q5 3 10 0" stroke="#b5654a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {girl && <circle cx="8" cy="9" r="4" fill="#f08c7a" opacity="0.35" />}
    {/* tay đặt lên bàn phím */}
    <path d="M24 66C46 82 62 94 76 112" stroke="#f8fafc" strokeWidth="19" strokeLinecap="round" fill="none" />
    <circle cx="82" cy="118" r="8" fill={SKIN} />
  </g>
);

export const StudentsIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 520 330" className={className} role="img" aria-label="Một học sinh nam và một học sinh nữ cùng luyện đề Toán trên máy tính">
    {/* nền */}
    <circle cx="260" cy="170" r="150" fill="rgb(255 255 255 / 0.05)" />
    <circle cx="260" cy="170" r="108" fill="rgb(255 255 255 / 0.05)" />

    {/* hai học sinh */}
    <g transform="translate(108 128)"><Student /></g>
    <g transform="translate(412 128) scale(-1 1)"><Student girl /></g>

    {/* màn hình */}
    <rect x="248" y="206" width="24" height="30" fill="#2c3a63" />
    <rect x="220" y="232" width="80" height="8" rx="4" fill="#3a4a78" />
    <rect x="148" y="62" width="224" height="150" rx="12" fill="#0b1226" stroke="#43568f" strokeWidth="2" />
    <rect x="157" y="71" width="206" height="132" rx="5" fill="#f8fafc" />
    <rect x="157" y="71" width="206" height="22" rx="5" fill="#2c4f9b" />
    <text x="167" y="86" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">Câu 7</text>
    <rect x="311" y="75" width="46" height="14" rx="7" fill="#e8430f" />
    <text x="334" y="85.5" fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">44:59</text>
    <text x="167" y="112" fill="#1e293b" fontSize="11" fontStyle="italic" fontFamily="Newsreader, serif">Đạo hàm của y = x³ − 3x là:</text>
    {[0, 1, 2, 3].map((i) => (
      <g key={i} transform={`translate(0 ${i * 20})`}>
        <rect x="167" y="120" width="186" height="16" rx="8" fill={i === 1 ? '#fff1ea' : '#eef2f8'} stroke={i === 1 ? '#e8430f' : 'none'} strokeWidth="1.3" />
        <circle cx="178" cy="128" r="4.5" fill={i === 1 ? '#e8430f' : '#fff'} stroke={i === 1 ? 'none' : '#a7b3c9'} />
        {i === 1 && <path d="M175.8 128l1.7 1.7 3-3.2" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        <rect x="190" y="125.5" width={[78, 64, 90, 56][i]} height="5" rx="2.5" fill={i === 1 ? '#f2a98c' : '#c3cddd'} />
      </g>
    ))}

    {/* bàn và bàn phím */}
    <rect x="30" y="246" width="460" height="14" rx="5" fill="#c98b5b" />
    <rect x="30" y="258" width="460" height="4" fill="#a96f43" />
    <rect x="186" y="238" width="148" height="9" rx="3" fill="#dbe3ee" />
    {Array.from({ length: 12 }).map((_, i) => (
      <rect key={i} x={191 + i * 12} y="240" width="9" height="2.5" rx="1" fill="#9aa8c2" />
    ))}
    <rect x="62" y="262" width="12" height="52" fill="#a96f43" />
    <rect x="446" y="262" width="12" height="52" fill="#a96f43" />
    <ellipse cx="260" cy="318" rx="215" ry="7" fill="rgb(0 0 0 / 0.22)" />

    {/* sách và bút trên bàn */}
    <rect x="52" y="232" width="52" height="14" rx="2" fill="#e8430f" />
    <rect x="52" y="226" width="48" height="6" rx="2" fill="#f4f6fa" />
    <rect x="426" y="236" width="40" height="10" rx="2" fill="#2c6b4f" />
    <rect x="432" y="230" width="34" height="6" rx="2" fill="#f4f6fa" />
  </svg>
);

export default StudentsIllustration;
