'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ProductionData, TARGETS } from '@/lib/utils';

interface ProductionChartProps {
  data: ProductionData[];
  title: string;
}

export default function ProductionChart({ data, title }: ProductionChartProps) {
  const chartData = data.map((item) => ({
    time: new Date(item.datetime).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    speed: Number(item.speed.toFixed(2)),
    target: TARGETS.hourly,
  }));

  return (
    <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
      <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
        {title}
      </h3>
      
      <div className="h-[300px] md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6b2c" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ff6b2c" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.3)" />
            
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              label={{
                value: 'т/ч',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#6b7280', fontSize: '14px' },
              }}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 14, 26, 0.95)',
                border: '1px solid rgba(30, 58, 95, 0.5)',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#ff6b2c' }}
            />
            
            <Legend
              wrapperStyle={{
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
            />
            
            <ReferenceLine
              y={TARGETS.hourly}
              stroke="#00ff88"
              strokeDasharray="5 5"
              label={{
                value: `План: ${TARGETS.hourly} т/ч`,
                position: 'right',
                fill: '#00ff88',
                fontSize: 12,
                fontFamily: 'JetBrains Mono',
              }}
            />
            
            <ReferenceLine
              y={TARGETS.hourly * 0.9}
              stroke="#ffb800"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            
            <ReferenceLine
              y={TARGETS.hourly * 0.8}
              stroke="#ff3366"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#ff6b2c"
              strokeWidth={3}
              dot={{ fill: '#ff6b2c', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#ff6b2c', stroke: '#fff', strokeWidth: 2 }}
              name="Скорость"
              fill="url(#speedGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-industrial-success" style={{ boxShadow: '0 0 8px rgba(0, 255, 136, 0.5)' }} />
          <span className="text-xs text-gray-400">План</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-industrial-warning opacity-70" />
          <span className="text-xs text-gray-400">Предупр.</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-industrial-danger opacity-70" />
          <span className="text-xs text-gray-400">Критич.</span>
        </div>
      </div>
    </div>
  );
}