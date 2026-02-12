import { useState, useMemo } from 'react'
import { Card, DatePicker, Space, Row, Col, Tag, Empty, Statistic } from 'antd'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef, themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community'

const gridTheme = themeQuartz.withPart(colorSchemeDarkBlue)
import dayjs from 'dayjs'
import { getTrainingData } from '@/api/client'
import type { TrainingSample } from '@/types/api'

ModuleRegistry.registerModules([AllCommunityModule])

const { RangePicker } = DatePicker

export default function TrainingAnalysis() {
  const { symbol = 'NVDA' } = useParams()
  const [range, setRange] = useState<[string, string]>(['2026-02-02', '2026-02-06'])

  const { data: training, isLoading } = useQuery({
    queryKey: ['training-data', symbol, range],
    queryFn: () => getTrainingData({ symbol, from: range[0], to: range[1] }),
  })

  const samples = training?.samples ?? []
  const stats = training?.stats

  // Feature distribution histograms
  const featureHistograms = useMemo(() => {
    if (!stats?.features) return []
    const featureCols = [
      'avg_spread', 'avg_imbalance', 'avg_imbalance_l1', 'avg_imbalance_l5',
      'avg_depth_bid', 'avg_depth_ask', 'avg_book_slope_bid', 'avg_book_slope_ask',
      'avg_tail_bid_sz', 'avg_tail_ask_sz', 'avg_tail_imbalance',
      'trade_intensity', 'delta_mid_std',
    ]
    return featureCols
      .filter((col) => stats.features[col])
      .map((col) => {
        const vals = samples.map((s: TrainingSample) => (s as unknown as Record<string, number>)[col]).filter((v) => v != null)
        const st = stats.features[col]
        // Simple histogram: 20 bins
        const min = st.min
        const max = st.max
        const binCount = 20
        const binWidth = (max - min) / binCount || 1
        const bins = Array.from({ length: binCount }, (_, i) => ({
          x: (min + i * binWidth).toFixed(4),
          count: 0,
        }))
        vals.forEach((v) => {
          const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1)
          if (idx >= 0 && idx < binCount) bins[idx].count++
        })

        return {
          title: { text: col, textStyle: { fontSize: 12, color: '#ccc' } },
          tooltip: { trigger: 'axis' },
          grid: { left: 45, right: 10, top: 30, bottom: 25 },
          xAxis: { type: 'category' as const, data: bins.map((b) => b.x), axisLabel: { rotate: 45, fontSize: 9 } },
          yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: '#333' } } },
          series: [{ type: 'bar', data: bins.map((b) => b.count), itemStyle: { color: '#42a5f5' } }],
        }
      })
  }, [stats, samples])

  // Direction label balance
  const directionOption = useMemo(() => {
    if (!stats?.labels?.direction_1m) return null
    const d = stats.labels.direction_1m
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { name: 'Down (-1)', value: d['-1'] ?? 0, itemStyle: { color: '#ef5350' } },
          { name: 'Flat (0)', value: d['0'] ?? 0, itemStyle: { color: '#78909c' } },
          { name: 'Up (+1)', value: d['1'] ?? 0, itemStyle: { color: '#26a69a' } },
        ],
        label: { formatter: '{b}: {c} ({d}%)' },
      }],
    }
  }, [stats])

  // Return distribution histogram
  const returnHistOption = useMemo(() => {
    if (!samples.length) return null
    const returns = samples.map((s: TrainingSample) => s.return_1m)
    const min = Math.min(...returns)
    const max = Math.max(...returns)
    const binCount = 30
    const binWidth = (max - min) / binCount || 1
    const bins = Array.from({ length: binCount }, (_, i) => ({
      x: ((min + i * binWidth) * 100).toFixed(3) + '%',
      center: min + (i + 0.5) * binWidth,
      count: 0,
    }))
    returns.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1)
      if (idx >= 0) bins[idx].count++
    })

    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category' as const, data: bins.map((b) => b.x), axisLabel: { rotate: 45, fontSize: 9 } },
      yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: '#333' } } },
      series: [{
        type: 'bar',
        data: bins.map((b) => ({
          value: b.count,
          itemStyle: { color: b.center >= 0 ? '#26a69a' : '#ef5350' },
        })),
      }],
    }
  }, [samples])

  // AG Grid columns
  const gridCols: ColDef[] = useMemo(() => {
    if (!samples.length) return []
    return Object.keys(samples[0]).map((k) => ({
      field: k,
      headerName: k,
      width: k === 'date' ? 110 : k === 'ts' ? 160 : 100,
      valueFormatter: ['return_1m', 'avg_spread', 'avg_imbalance', 'avg_imbalance_l1', 'avg_imbalance_l5',
        'avg_book_slope_bid', 'avg_book_slope_ask', 'avg_tail_imbalance', 'trade_intensity', 'delta_mid_std'].includes(k)
        ? (p: { value: number }) => p.value?.toFixed?.(6) ?? ''
        : k === 'ts'
          ? (p: { value: number }) => p.value ? new Date(p.value).toISOString().replace('T', ' ').slice(0, 19) : ''
          : undefined,
    }))
  }, [samples])

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card size="small">
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%', display: 'flex' }}>
          <Space>
            <Tag color="blue">{symbol}</Tag>
            <span>Training Analysis</span>
            {training && <Tag>{training.count} samples</Tag>}
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

      {stats?.labels?.return_1m && (
        <Row gutter={16}>
          <Col span={6}><Card size="small"><Statistic title="Samples" value={training?.count ?? 0} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Return Mean" value={(stats.labels.return_1m.mean * 100).toFixed(4) + '%'} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Return Std" value={(stats.labels.return_1m.std * 100).toFixed(4) + '%'} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Features" value={Object.keys(stats.features).length} /></Card></Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Direction Balance" size="small">
            {directionOption ? <ReactECharts option={directionOption} style={{ height: 260 }} /> : <Empty />}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Return Distribution" size="small">
            {returnHistOption ? <ReactECharts option={returnHistOption} style={{ height: 260 }} /> : <Empty />}
          </Card>
        </Col>
      </Row>

      <Card title="Feature Distributions" size="small">
        <Row gutter={[16, 16]}>
          {featureHistograms.map((opt, i) => (
            <Col span={8} key={i}>
              <ReactECharts option={opt} style={{ height: 180 }} />
            </Col>
          ))}
        </Row>
      </Card>

      {samples.length > 0 && (
        <Card title="Samples" size="small">
          <div style={{ height: 400 }}>
            <AgGridReact
              rowData={samples}
              columnDefs={gridCols}
              theme={gridTheme}
              headerHeight={32}
              rowHeight={28}
            />
          </div>
        </Card>
      )}

      {!training && !isLoading && <Empty description="Select a date range" />}
    </Space>
  )
}
