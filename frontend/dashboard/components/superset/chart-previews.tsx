import React from 'react';

/** Etichetta e colore badge per ogni viz_type noto di Superset. */
export const VIZ_META: Record<string, { label: string; badgeClass: string }> = {
  bar: { label: 'Bar Chart', badgeClass: 'bg-blue-100 text-blue-700' },
  dist_bar: { label: 'Bar Chart', badgeClass: 'bg-blue-100 text-blue-700' },
  line: { label: 'Line Chart', badgeClass: 'bg-green-100 text-green-700' },
  pie: { label: 'Pie Chart', badgeClass: 'bg-orange-100 text-orange-700' },
  table: { label: 'Table', badgeClass: 'bg-gray-100 text-gray-700' },
  big_number: { label: 'Big Number', badgeClass: 'bg-purple-100 text-purple-700' },
  big_number_total: { label: 'Big Number', badgeClass: 'bg-purple-100 text-purple-700' },
  area: { label: 'Area Chart', badgeClass: 'bg-teal-100 text-teal-700' },
  scatter: { label: 'Scatter Plot', badgeClass: 'bg-red-100 text-red-700' },
};

function BarPreview() {
  return (
    <svg viewBox="0 0 80 50" width="80" height="50">
      <rect x="5" y="30" width="12" height="18" fill="#4299e1" rx="2" />
      <rect x="22" y="15" width="12" height="33" fill="#4299e1" rx="2" />
      <rect x="39" y="22" width="12" height="26" fill="#4299e1" rx="2" />
      <rect x="56" y="8" width="12" height="40" fill="#4299e1" rx="2" />
    </svg>
  );
}

function LinePreview() {
  const pts: [number, number][] = [[5, 40], [20, 25], [35, 30], [50, 10], [65, 18], [78, 8]];
  return (
    <svg viewBox="0 0 80 50" width="80" height="50">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#48bb78" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#48bb78" />
      ))}
    </svg>
  );
}

function PiePreview() {
  return (
    <svg viewBox="0 0 80 50" width="80" height="50">
      <circle cx="40" cy="25" r="20" fill="#ed8936" />
      <path d="M40,25 L40,5 A20,20 0 0,1 60,25 Z" fill="#e53e3e" />
      <path d="M40,25 L60,25 A20,20 0 0,1 28,43 Z" fill="#48bb78" />
    </svg>
  );
}

function TablePreview() {
  return (
    <svg viewBox="0 0 80 50" width="80" height="50">
      <rect x="2" y="2" width="76" height="10" fill="#a0aec0" rx="1" />
      {[15, 25, 35, 45].map((y) => (
        <React.Fragment key={y}>
          <rect x="2" y={y} width="36" height="8" fill="#e2e8f0" rx="1" />
          <rect x="42" y={y} width="36" height="8" fill="#e2e8f0" rx="1" />
        </React.Fragment>
      ))}
    </svg>
  );
}

function BigNumberPreview() {
  return (
    <svg viewBox="0 0 80 50" width="80" height="50">
      <text x="40" y="32" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#805ad5">42K</text>
    </svg>
  );
}

function AreaPreview() {
  return (
    <svg viewBox="0 0 80 50" width="80" height="50">
      <path d="M5,40 C15,28 25,32 35,18 C45,5 55,15 78,10 L78,48 L5,48 Z" fill="#81e6d9" opacity="0.7" />
      <polyline points="5,40 20,28 35,18 50,12 65,15 78,10" fill="none" stroke="#319795" strokeWidth="2" />
    </svg>
  );
}

function ScatterPreview() {
  const dots: [number, number][] = [[10, 38], [20, 15], [35, 28], [45, 10], [55, 35], [65, 20], [72, 42]];
  return (
    <svg viewBox="0 0 80 50" width="80" height="50">
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#fc8181" opacity="0.8" />
      ))}
    </svg>
  );
}

/** Anteprima statica per ogni viz_type (fallback "N/A" gestito dal chiamante). */
export const PREVIEWS: Record<string, React.ReactNode> = {
  bar: <BarPreview />,
  dist_bar: <BarPreview />,
  line: <LinePreview />,
  pie: <PiePreview />,
  table: <TablePreview />,
  big_number: <BigNumberPreview />,
  big_number_total: <BigNumberPreview />,
  area: <AreaPreview />,
  scatter: <ScatterPreview />,
};
