import { useState, useMemo } from 'react'
import { Card, DatePicker, Space, Statistic, Row, Col, Tag, Typography } from 'antd'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { getBars, getSymbolSummary } from '@/api/client'
import type { Bar } from '@/types/api'

const { RangePicker } = DatePicker

export default function SymbolDashboard() {
  const { symbol = 'NVDA' } = useParams()
  const [range, setRange] = useState<[string, string]>(['2026-02-02', '2026-02-06'])

  const { data: bars } = useQuery({
    queryKey: ['bars', symbol, range],
    queryFn: () => getBars({ symbol, from: range[0], to: range[1] }),
  })

  const { data: summary } = useQuery({
    queryKey: ['summary', symbol],
    queryFn: () => getSymbolSummary(symbol),
  })

  const barData = bars?.bars ?? []

  // Candlestick chart
  const candlestickOption = useMemo(() => {
    if (!barData.length) return {}
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      grid: [
        { left: 60, right: 30, top: 30, height: '45%' },
        { left: 60, right: 30, top: '60%', height: '15%' },
      ],
      xAxis: [
        { type: 'time', gridIndex: 0, axisLabel: { show: false } },
        { type: 'time', gridIndex: 1 },
      ],
      yAxis: [
        { gridIndex: 0, scale: true, splitArea: { show: true } },
        { gridIndex: 1, scale: true, splitArea: { show: true } },
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1] },
        { type: 'slider', xAxisIndex: [0, 1], bottom: 10 },
      ],
      series: [
        {
          name: 'OHLC',
          type: 'candlestick',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: barData.map((b: Bar) => [b.ts, b.open, b.close, b.low, b.high]),
          itemStyle: {
            color: '#26a69a',
            color0: '#ef5350',
            borderColor: '#26a69a',
            borderColor0: '#ef5350',
          },
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: barData.map((b: Bar) => [b.ts, b.volume]),
          itemStyle: {
            color: (p: { dataIndex: number }) => {
              const b = barData[p.dataIndex]
              return b.close >= b.open ? '#26a69a' : '#ef5350'
            },
          },
        },
      ],
    }
  }, [barData])

  // Feature grid charts
  const featureCharts = useMemo(() => {
    if (!barData.length) return []
    const ts = barData.map((b: Bar) => b.ts)
    const make = (title: string, series: { name: string; data: number[]; color: string }[]) => ({
      title: { text: title, textStyle: { fontSize: 13, color: '#ccc' } },
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 0, textStyle: { color: '#999' } },
      grid: { left: 50, right: 15, top: 35, bottom: 25 },
      xAxis: { type: 'time' as const, data: ts, show: false },
      yAxis: { type: 'value' as const, scale: true, splitLine: { lineStyle: { color: '#333' } } },
      series: series.map((s) => ({
        name: s.name,
        type: 'line',
        data: s.data.map((v, i) => [ts[i], v]),
        showSymbol: false,
        lineStyle: { width: 1.5, color: s.color },
        itemStyle: { color: s.color },
      })),
    })

    return [
      make('Avg Spread', [
        { name: 'Spread', data: barData.map((b: Bar) => b.avg_spread), color: '#ffa726' },
      ]),
      make('Avg Imbalance', [
        { name: 'Imbalance', data: barData.map((b: Bar) => b.avg_imbalance), color: '#42a5f5' },
      ]),
      make('Avg Depth', [
        { name: 'Bid', data: barData.map((b: Bar) => b.avg_depth_bid), color: '#26a69a' },
        { name: 'Ask', data: barData.map((b: Bar) => b.avg_depth_ask), color: '#ef5350' },
      ]),
      make('Avg Book Slope', [
        { name: 'Bid', data: barData.map((b: Bar) => b.avg_book_slope_bid), color: '#26a69a' },
        { name: 'Ask', data: barData.map((b: Bar) => b.avg_book_slope_ask), color: '#ef5350' },
      ]),
    ]
  }, [barData])

  // Returns chart
  const returnsOption = useMemo(() => {
    if (!barData.length) return {}
    const cumReturn = barData.reduce<number[]>((acc, b: Bar) => {
      const prev = acc.length ? acc[acc.length - 1] : 0
      acc.push(prev + b.return_1m)
      return acc
    }, [])

    return {
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#999' } },
      grid: { left: 60, right: 30, top: 35, bottom: 50 },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 5 }],
      xAxis: { type: 'time' },
      yAxis: [
        { type: 'value', name: 'Return 1m', scale: true, splitLine: { lineStyle: { color: '#333' } } },
        { type: 'value', name: 'Cumulative', scale: true },
      ],
      series: [
        {
          name: 'Return 1m',
          type: 'bar',
          data: barData.map((b: Bar) => [b.ts, b.return_1m]),
          itemStyle: {
            color: (p: { data: [number, number] }) =>
              p.data[1] >= 0 ? '#26a69a' : '#ef5350',
          },
        },
        {
          name: 'Cumulative',
          type: 'line',
          yAxisIndex: 1,
          data: barData.map((b: Bar, i: number) => [b.ts, cumReturn[i]]),
          showSymbol: false,
          lineStyle: { width: 2, color: '#ffa726' },
          itemStyle: { color: '#ffa726' },
        },
      ],
    }
  }, [barData])

  const totalVolume = barData.reduce((s: number, b: Bar) => s + b.volume, 0)
  const lastBar = barData[barData.length - 1]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card size="small">
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%', display: 'flex' }}>
          <Space>
            <Typography.Title level={4} style={{ margin: 0 }}>{symbol}</Typography.Title>
            {summary?.dataset && <Tag>{summary.dataset}</Tag>}
            {lastBar && (
              <Typography.Text style={{ fontSize: 20, fontWeight: 600, color: lastBar.return_1m >= 0 ? '#26a69a' : '#ef5350' }}>
                ${lastBar.close.toFixed(2)}
              </Typography.Text>
            )}
          </Space>
          <RangePicker
            value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1])
                setRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
            }}
          />
        </Space>
      </Card>

      {summary && (
        <Row gutter={16}>
          {Object.entries(summary.zones).map(([zone, info]) => (
            <Col span={6} key={zone}>
              <Card size="small">
                <Statistic
                  title={zone}
                  value={info.total_records.toLocaleString()}
                  suffix={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{info.total_size_mb.toFixed(1)} MB</Typography.Text>}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card title="Price & Volume" size="small">
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col><Statistic title="Bars" value={bars?.count ?? 0} /></Col>
          <Col><Statistic title="Total Volume" value={totalVolume.toLocaleString()} /></Col>
          {lastBar && <Col><Statistic title="Avg Spread" value={lastBar.avg_spread.toFixed(4)} /></Col>}
        </Row>
        {barData.length > 0 && <ReactECharts option={candlestickOption} style={{ height: 450 }} />}
      </Card>

      <Row gutter={16}>
        {featureCharts.map((opt, i) => (
          <Col span={12} key={i}>
            <Card size="small">
              <ReactECharts option={opt} style={{ height: 200 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Returns" size="small">
        {barData.length > 0 && <ReactECharts option={returnsOption} style={{ height: 350 }} />}
      </Card>
    </Space>
  )
}
