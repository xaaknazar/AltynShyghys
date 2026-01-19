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
    <div className="bg-white border-2 border-corporate-neutral-200 rounded-2xl p-8 shadow-card-lg">
      <div className="mb-8 pb-4 border-b-2 border-corporate-neutral-100">
        <h3 className="text-xl font-display font-semibold text-corporate-neutral-900 tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-sm text-corporate-neutral-600">Динамика производительности за период</p>
      </div>

      <div className="h-[350px] md:h-[450px] bg-gradient-to-br from-corporate-neutral-50 to-white rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />

            <XAxis
              dataKey="time"
              stroke="#64748b"
              style={{
                fontSize: '11px',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500
              }}
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fill: '#475569' }}
            />

            <YAxis
              stroke="#64748b"
              style={{
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 500
              }}
              tick={{ fill: '#475569' }}
              label={{
                value: 'т/ч',
                angle: -90,
                position: 'insideLeft',
                style: {
                  fill: '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'Inter, system-ui, sans-serif'
                },
              }}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '13px',
                padding: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{
                color: '#0f172a',
                fontWeight: 600,
                marginBottom: '8px',
                fontFamily: 'JetBrains Mono, monospace'
              }}
              itemStyle={{
                color: '#0ea5e9',
                fontWeight: 500,
                fontFamily: 'JetBrains Mono, monospace'
              }}
            />

            <Legend
              wrapperStyle={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                paddingTop: '20px'
              }}
              iconType="line"
            />

            <ReferenceLine
              y={TARGETS.hourly}
              stroke="#059669"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `План: ${TARGETS.hourly} т/ч`,
                position: 'right',
                fill: '#059669',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />

            <ReferenceLine
              y={TARGETS.hourly * 0.9}
              stroke="#f97316"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />

            <ReferenceLine
              y={TARGETS.hourly * 0.8}
              stroke="#dc2626"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />

            <Line
              type="monotone"
              dataKey="speed"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 5, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 3 }}
              name="Скорость (т/ч)"
              fill="url(#speedGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t-2 border-corporate-neutral-100">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-corporate-success-50 rounded-lg border border-corporate-success-200">
          <div className="w-8 h-1 bg-corporate-success-600 rounded-full" />
          <div>
            <div className="text-xs font-semibold text-corporate-success-700">План</div>
            <div className="text-xs text-corporate-neutral-600">{TARGETS.hourly} т/ч</div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-corporate-warning-50 rounded-lg border border-corporate-warning-200">
          <div className="w-8 h-1 bg-corporate-warning-600 rounded-full" />
          <div>
            <div className="text-xs font-semibold text-corporate-warning-700">Предупреждение</div>
            <div className="text-xs text-corporate-neutral-600">{TARGETS.hourly * 0.9} т/ч</div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-corporate-danger-50 rounded-lg border border-corporate-danger-200">
          <div className="w-8 h-1 bg-corporate-danger-600 rounded-full" />
          <div>
            <div className="text-xs font-semibold text-corporate-danger-700">Критично</div>
            <div className="text-xs text-corporate-neutral-600">&lt; {TARGETS.hourly * 0.8} т/ч</div>
          </div>
        </div>
      </div>
    </div>
  );
}