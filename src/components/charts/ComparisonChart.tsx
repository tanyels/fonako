'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface ChartDataPoint {
  date: string
  fund: number
  benchmark: number
}

interface ComparisonChartProps {
  data: ChartDataPoint[]
  benchmark: 'USD' | 'EUR' | 'GOLD' | 'SP500'
}

export function ComparisonChart({ data, benchmark }: ComparisonChartProps) {

  const benchmarkLabel = {
    USD: 'USD Tutsaydınız',
    EUR: 'EUR Tutsaydınız',
    GOLD: 'Altın Tutsaydınız',
    SP500: 'S&P 500',
  }[benchmark]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [
            `${value.toLocaleString('tr-TR')} ₺`,
          ]}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="fund"
          name="Fon Değeri"
          stroke="#6b7280"
          fill="#e5e7eb"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="benchmark"
          name={benchmarkLabel}
          stroke="#10b981"
          fill="#d1fae5"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
