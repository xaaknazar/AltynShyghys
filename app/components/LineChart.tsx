'use client';

interface LineChartProps {
  data: {
    label: string;
    value: number;
  }[];
  maxValue: number;
  minNorm?: number;
  maxNorm?: number;
  height?: number;
  showGrid?: boolean;
  lineColor?: string;
  pointColor?: string;
  normLineColor?: string;
}

export default function LineChart({
  data,
  maxValue,
  minNorm,
  maxNorm,
  height = 320,
  showGrid = true,
  lineColor = '#3b82f6',
  pointColor = '#3b82f6',
  normLineColor = '#f59e0b',
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-400">
        Нет данных для отображения
      </div>
    );
  }

  const padding = { top: 20, right: 60, bottom: 40, left: 40 };
  const chartWidth = 100; // процентов
  const chartHeight = height;

  // Вычисляем позиции точек
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1 || 1)) * chartWidth;
    const y = ((maxValue - item.value) / maxValue) * chartHeight;
    return { x, y, label: item.label, value: item.value };
  });

  // Создаем путь для линии
  const linePath = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x} ${point.y}`;
    })
    .join(' ');

  // Позиции линий норм
  const minNormY = minNorm ? ((maxValue - minNorm) / maxValue) * chartHeight : null;
  const maxNormY = maxNorm ? ((maxValue - maxNorm) / maxValue) * chartHeight : null;

  // Определяем цвет точки в зависимости от нормы
  const getPointStatus = (value: number): 'normal' | 'warning' | 'danger' => {
    if (minNorm !== undefined && maxNorm !== undefined) {
      if (value >= minNorm && value <= maxNorm) return 'normal';
      if (value >= minNorm * 0.8 && value <= maxNorm * 1.2) return 'warning';
      return 'danger';
    }
    if (maxNorm !== undefined) {
      if (value <= maxNorm) return 'normal';
      if (value <= maxNorm * 1.2) return 'warning';
      return 'danger';
    }
    return 'normal';
  };

  const getStatusColor = (status: 'normal' | 'warning' | 'danger'): string => {
    switch (status) {
      case 'normal':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'danger':
        return '#ef4444';
      default:
        return pointColor;
    }
  };

  return (
    <div className="relative w-full" style={{ height: chartHeight + padding.top + padding.bottom }}>
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`}
        preserveAspectRatio="none"
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Сетка */}
          {showGrid && (
            <g className="opacity-20">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={ratio * chartHeight}
                  x2={chartWidth}
                  y2={ratio * chartHeight}
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              ))}
            </g>
          )}

          {/* Линии норм */}
          {maxNormY !== null && (
            <g>
              <line
                x1="0"
                y1={maxNormY}
                x2={chartWidth}
                y2={maxNormY}
                stroke={normLineColor}
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.6"
              />
              <text
                x={chartWidth + 5}
                y={maxNormY}
                fontSize="10"
                fill={normLineColor}
                dominantBaseline="middle"
              >
                MAX {maxNorm}
              </text>
            </g>
          )}

          {minNormY !== null && (
            <g>
              <line
                x1="0"
                y1={minNormY}
                x2={chartWidth}
                y2={minNormY}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.6"
              />
              <text
                x={chartWidth + 5}
                y={minNormY}
                fontSize="10"
                fill="#10b981"
                dominantBaseline="middle"
              >
                MIN {minNorm}
              </text>
            </g>
          )}

          {/* Линия графика */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Точки */}
          {points.map((point, index) => {
            const status = getPointStatus(point.value);
            const color = getStatusColor(status);

            return (
              <g key={index}>
                {/* Точка */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill={color}
                  stroke="white"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:r-5 transition-all"
                />

                {/* Tooltip на hover */}
                <g className="opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                  <rect
                    x={point.x - 30}
                    y={point.y - 40}
                    width="60"
                    height="30"
                    fill="white"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x={point.x}
                    y={point.y - 28}
                    fontSize="10"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 16}
                    fontSize="12"
                    fill="#1e293b"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {point.value.toFixed(1)}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Метки оси X */}
      <div className="flex justify-between mt-2 px-10">
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 10)) === 0).map((item, index) => (
          <div key={index} className="text-xs text-gray-500 font-mono -rotate-45 origin-top-left">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
