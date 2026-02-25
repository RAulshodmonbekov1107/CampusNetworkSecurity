import React, { useMemo } from 'react';

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

const SparkLine: React.FC<SparkLineProps> = ({
  data,
  width = 80,
  height = 28,
  color = '#3b82f6',
  fill = true,
}) => {
  const path = useMemo(() => {
    if (!data.length) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const step = width / Math.max(data.length - 1, 1);
    const points = data.map((v, i) => ({
      x: i * step,
      y: height - ((v - min) / range) * (height - 4) - 2,
    }));
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }, [data, width, height]);

  const fillPath = useMemo(() => {
    if (!path || !fill) return '';
    return `${path} L${width},${height} L0,${height} Z`;
  }, [path, fill, width, height]);

  if (!data.length) return null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {fill && (
        <path d={fillPath} fill={color} opacity={0.1} />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default SparkLine;
