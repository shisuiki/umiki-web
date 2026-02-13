import { useState, useMemo } from 'react'
import { Card, Select, Space, Tag, Statistic, Row, Col, Typography } from 'antd'
import { ProTable } from '@ant-design/pro-components'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { getQCReports, getQCAlerts } from '@/api/client'
import type { QCReport, QCAlert } from '@/types/api'
import type { ProColumns } from '@ant-design/pro-components'

const alertColors: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
}

const MID_SPREAD_COLOR = '#ff6d00'
const ICEBERG_COLOR = '#00bfa5'

export default function QCPage() {
  const [symbolFilter, setSymbolFilter] = useState<string>()

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['qc', symbolFilter],
    queryFn: () => getQCReports(symbolFilter ? { symbol: symbolFilter } : undefined),
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['qc-alerts'],
    queryFn: getQCAlerts,
  })

  const symbols = useMemo(() => {
    const set = new Set(reports.map((r) => r.symbol))
    return Array.from(set).sort()
  }, [reports])

  const totals = useMemo(() => {
    const records = reports.reduce((s, r) => s + r.n_records, 0)
    const trades = reports.reduce((s, r) => s + (r.n_trades ?? 0), 0)
    const bboCrossed = reports.reduce((s, r) => s + r.n_bbo_crossed, 0)
    const bboLocked = reports.reduce((s, r) => s + r.n_bbo_locked, 0)
    const midSpread = reports.reduce((s, r) => s + (r.n_mid_spread ?? 0), 0)
    const iceberg = reports.reduce((s, r) => s + (r.n_iceberg_refills ?? 0), 0)
    const totalHidden = midSpread + iceberg
    const hiddenRate = trades > 0 ? (totalHidden / trades) * 100 : 0
    return { records, trades, bboCrossed, bboLocked, midSpread, iceberg, totalHidden, hiddenRate, alerts: alerts.length }
  }, [reports, alerts])

  // Heatmap: symbol × date → health
  const heatmapOption = useMemo(() => {
    const dates = [...new Set(reports.map((r) => r.date))].sort()
    const syms = [...new Set(reports.map((r) => r.symbol))].sort()
    const data = reports.map((r) => {
      const hiddenPct = (r.mid_spread_pct ?? 0) + (r.iceberg_pct ?? 0)
      const health = r.n_bbo_crossed > 0 ? 3 : r.n_bbo_locked > 0 ? 2 : hiddenPct > 15 ? 1 : 0
      return [dates.indexOf(r.date), syms.indexOf(r.symbol), health]
    })
    return {
      tooltip: {
        formatter: (p: { data: number[] }) => {
          const r = reports.find(
            (r) => r.date === dates[p.data[0]] && r.symbol === syms[p.data[1]],
          )
          if (!r) return ''
          const totalPct = (r.mid_spread_pct ?? 0) + (r.iceberg_pct ?? 0)
          return `<b>${r.symbol} ${r.date}</b><br/>`
            + `Trades: ${(r.n_trades ?? 0).toLocaleString()}<br/>`
            + `Mid-Spread: ${(r.mid_spread_pct ?? 0).toFixed(1)}% | Iceberg: ${(r.iceberg_pct ?? 0).toFixed(1)}%<br/>`
            + `<b>Total Hidden: ${totalPct.toFixed(1)}%</b>`
        },
      },
      xAxis: { type: 'category' as const, data: dates },
      yAxis: { type: 'category' as const, data: syms },
      visualMap: {
        min: 0,
        max: 3,
        show: false,
        inRange: { color: ['#52c41a', '#faad14', '#ffa726', '#ff4d4f'] },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: false },
        itemStyle: { borderRadius: 4 },
      }],
    }
  }, [reports])

  // Stacked bar: hidden order types as % of trades per day
  const hiddenStackOption = useMemo(() => {
    if (!reports.length) return null
    const dates = [...new Set(reports.map((r) => r.date))].sort()
    const byDate: Record<string, { ms: number[]; ic: number[] }> = {}
    reports.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { ms: [], ic: [] }
      byDate[r.date].ms.push(r.mid_spread_pct ?? 0)
      byDate[r.date].ic.push(r.iceberg_pct ?? 0)
    })
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (p: { seriesName: string; value: number; color: string }[]) => {
          const total = p.reduce((s, i) => s + i.value, 0)
          return `<b>${p[0] && 'axisValue' in p[0] ? (p[0] as unknown as { axisValue: string }).axisValue : ''}</b><br/>`
            + p.map((i) => `<span style="color:${i.color}">\u25CF</span> ${i.seriesName}: ${i.value.toFixed(2)}%`).join('<br/>')
            + `<br/><b>Total: ${total.toFixed(2)}%</b>`
        },
      },
      legend: { textStyle: { color: '#999' } },
      grid: { left: 50, right: 20, top: 35, bottom: 30 },
      xAxis: { type: 'category' as const, data: dates },
      yAxis: { type: 'value' as const, axisLabel: { formatter: (v: number) => v + '%' }, splitLine: { lineStyle: { color: '#333' } } },
      series: [
        {
          name: 'Mid-Spread',
          type: 'bar',
          stack: 'hidden',
          data: dates.map((d) => avg(byDate[d]?.ms ?? [])),
          itemStyle: { color: MID_SPREAD_COLOR },
        },
        {
          name: 'Iceberg',
          type: 'bar',
          stack: 'hidden',
          data: dates.map((d) => avg(byDate[d]?.ic ?? [])),
          itemStyle: { color: ICEBERG_COLOR },
        },
      ],
    }
  }, [reports])

  // Hidden depth bar chart: tail bid vs tail ask per day
  const tailDepthOption = useMemo(() => {
    if (!reports.length) return null
    const dates = [...new Set(reports.map((r) => r.date))].sort()
    const bidByDate: Record<string, number[]> = {}
    const askByDate: Record<string, number[]> = {}
    reports.forEach((r) => {
      if (!bidByDate[r.date]) { bidByDate[r.date] = []; askByDate[r.date] = [] }
      bidByDate[r.date].push(r.tail_bid_mean ?? 0)
      askByDate[r.date].push(r.tail_ask_mean ?? 0)
    })
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (p: { name: string; seriesName: string; value: number }[]) =>
          `<b>${p[0]?.name}</b><br/>` + p.map((i) =>
            `${i.seriesName}: ${i.value >= 1000 ? (i.value / 1000).toFixed(1) + 'K' : i.value.toFixed(2)}`
          ).join('<br/>'),
      },
      legend: { textStyle: { color: '#999' } },
      grid: { left: 60, right: 20, top: 35, bottom: 30 },
      xAxis: { type: 'category' as const, data: dates },
      yAxis: { type: 'value' as const, scale: true, splitLine: { lineStyle: { color: '#333' } }, axisLabel: { formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v) } },
      series: [
        { name: 'Tail Bid', type: 'bar', data: dates.map((d) => avg(bidByDate[d] ?? [])), itemStyle: { color: '#26a69a' } },
        { name: 'Tail Ask', type: 'bar', data: dates.map((d) => avg(askByDate[d] ?? [])), itemStyle: { color: '#ef5350' } },
      ],
    }
  }, [reports])

  // Action distribution pie
  const ACTION_NAMES: Record<string, string> = {
    A: 'Add', C: 'Cancel', T: 'Trade', M: 'Modify', F: 'Fill', R: 'Reset',
  }
  const actionOption = useMemo(() => {
    const merged: Record<string, number> = {}
    reports.forEach((r) => {
      if (r.action_dist) {
        Object.entries(r.action_dist).forEach(([k, v]) => {
          merged[k] = (merged[k] ?? 0) + v
        })
      }
    })
    const actionColors: Record<string, string> = { A: '#42a5f5', C: '#ffa726', T: '#26a69a', M: '#ab47bc', F: '#66bb6a', R: '#ef5350' }
    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { name: string; value: number; percent: number }) =>
          `${ACTION_NAMES[p.name] ?? p.name} (${p.name})<br/>${p.value.toLocaleString()} events (${p.percent}%)`,
      },
      legend: {
        orient: 'vertical' as const,
        right: 10,
        top: 'center',
        formatter: (name: string) => ACTION_NAMES[name] ?? name,
        textStyle: { color: '#ccc' },
      },
      series: [{
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['35%', '50%'],
        data: Object.entries(merged).map(([name, value]) => ({
          name,
          value,
          itemStyle: { color: actionColors[name] ?? '#78909c' },
        })),
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, formatter: '{b}: {d}%' } },
      }],
    }
  }, [reports])

  const alertColumns: ProColumns<QCAlert>[] = [
    {
      title: 'Level',
      dataIndex: 'level',
      width: 80,
      render: (_, r) => <Tag color={alertColors[r.level]}>{r.level}</Tag>,
    },
    { title: 'Symbol', dataIndex: 'symbol', width: 80 },
    { title: 'Date', dataIndex: 'date', width: 110 },
    { title: 'Message', dataIndex: 'message' },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Section A: Market Quality */}
      <Typography.Text strong style={{ fontSize: 14, color: '#999' }}>Market Quality</Typography.Text>
      <Row gutter={16}>
        <Col span={4}><Card size="small"><Statistic title="Total Records" value={totals.records} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="Total Trades" value={totals.trades} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="Avg Spread (mean)" value={reports.length ? (reports.reduce((s, r) => s + r.spread_mean, 0) / reports.length).toFixed(4) : '—'} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="Avg Spread (median)" value={reports.length ? (reports.reduce((s, r) => s + r.spread_median, 0) / reports.length).toFixed(4) : '—'} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="BBO Crossed" value={totals.bboCrossed} valueStyle={{ color: totals.bboCrossed > 0 ? '#ff4d4f' : '#52c41a' }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="BBO Locked" value={totals.bboLocked} valueStyle={{ color: totals.bboLocked > 0 ? '#faad14' : '#52c41a' }} /></Card></Col>
      </Row>

      {/* Section B: Hidden Orders — Mid-Spread + Iceberg */}
      <Typography.Text strong style={{ fontSize: 14, color: '#999' }}>Hidden Order Detection</Typography.Text>
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Hidden Rate"
              value={totals.hiddenRate.toFixed(1) + '%'}
              valueStyle={{ fontSize: 22, color: '#ffa726' }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {totals.totalHidden.toLocaleString()} / {totals.trades.toLocaleString()} trades
            </Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Mid-Spread" value={totals.midSpread.toLocaleString()} valueStyle={{ color: MID_SPREAD_COLOR }} />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Trade inside spread, no visible order
            </Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Iceberg Refill" value={totals.iceberg.toLocaleString()} valueStyle={{ color: ICEBERG_COLOR }} />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              L0 immediately refills after drain
            </Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Alerts" value={totals.alerts} valueStyle={{ color: totals.alerts > 0 ? '#ff4d4f' : '#52c41a' }} /></Card>
        </Col>
      </Row>
      <Typography.Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
        Conservative estimate — only solo trades with fresh book snapshots counted
      </Typography.Text>

      {/* Charts row */}
      <Row gutter={16}>
        <Col span={10}>
          <Card title="Hidden Orders by Type (% of Trades)" size="small">
            {hiddenStackOption ? <ReactECharts option={hiddenStackOption} style={{ height: 280 }} /> : null}
          </Card>
        </Col>
        <Col span={7}>
          <Card title="Hidden Depth (2-Tail)" size="small">
            {tailDepthOption ? <ReactECharts option={tailDepthOption} style={{ height: 280 }} /> : null}
          </Card>
        </Col>
        <Col span={7}>
          <Card title="Action Distribution" size="small">
            {reports.length > 0 && <ReactECharts option={actionOption} style={{ height: 280 }} />}
          </Card>
        </Col>
      </Row>

      <Card title="Health Matrix" size="small">
        {reports.length > 0 && <ReactECharts option={heatmapOption} style={{ height: 200 }} />}
      </Card>

      {/* QC Reports Table */}
      <Card
        title="QC Reports"
        size="small"
        extra={
          <Select
            placeholder="Symbol"
            allowClear
            style={{ width: 140 }}
            value={symbolFilter}
            onChange={setSymbolFilter}
            options={symbols.map((s) => ({ label: s, value: s }))}
          />
        }
      >
        <ProTable<QCReport>
          columns={[
            { title: 'Symbol', dataIndex: 'symbol', width: 80 },
            { title: 'Date', dataIndex: 'date', width: 100 },
            { title: 'Trades', dataIndex: 'n_trades', render: (_, r) => (r.n_trades ?? 0).toLocaleString(), sorter: (a, b) => (a.n_trades ?? 0) - (b.n_trades ?? 0), width: 100 },
            {
              title: <span style={{ color: MID_SPREAD_COLOR }}>Mid-Spread</span>,
              dataIndex: 'n_mid_spread',
              render: (_, r) => <Space size={4}><span>{(r.n_mid_spread ?? 0).toLocaleString()}</span><Tag color="orange" style={{ margin: 0 }}>{(r.mid_spread_pct ?? 0).toFixed(1)}%</Tag></Space>,
              sorter: (a, b) => (a.mid_spread_pct ?? 0) - (b.mid_spread_pct ?? 0),
              width: 150,
            },
            {
              title: <span style={{ color: ICEBERG_COLOR }}>Iceberg</span>,
              dataIndex: 'n_iceberg_refills',
              render: (_, r) => <Space size={4}><span>{(r.n_iceberg_refills ?? 0).toLocaleString()}</span><Tag color="cyan" style={{ margin: 0 }}>{(r.iceberg_pct ?? 0).toFixed(2)}%</Tag></Space>,
              sorter: (a, b) => (a.iceberg_pct ?? 0) - (b.iceberg_pct ?? 0),
              width: 130,
            },
            { title: 'Spread', dataIndex: 'spread_mean', render: (_, r) => r.spread_mean?.toFixed(4), width: 80 },
            { title: 'BBO X', dataIndex: 'n_bbo_crossed', render: (_, r) => <Tag color={r.n_bbo_crossed > 0 ? 'red' : 'green'}>{r.n_bbo_crossed}</Tag>, width: 70 },
            { title: 'BBO L', dataIndex: 'n_bbo_locked', width: 70 },
            { title: 'Tail Bid', dataIndex: 'tail_bid_mean', render: (_, r) => (r.tail_bid_mean ?? 0) >= 1000 ? ((r.tail_bid_mean ?? 0) / 1000).toFixed(1) + 'K' : (r.tail_bid_mean ?? 0).toFixed(0), width: 80 },
            { title: 'Tail Ask', dataIndex: 'tail_ask_mean', render: (_, r) => (r.tail_ask_mean ?? 0) >= 1000 ? ((r.tail_ask_mean ?? 0) / 1000).toFixed(1) + 'K' : (r.tail_ask_mean ?? 0).toFixed(0), width: 80 },
          ]}
          dataSource={reports}
          loading={isLoading}
          rowKey="id"
          search={false}
          pagination={false}
          options={false}
        />
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card title="Alerts" size="small">
          <ProTable<QCAlert>
            columns={alertColumns}
            dataSource={alerts}
            rowKey={(r) => `${r.symbol}-${r.date}-${r.message}`}
            search={false}
            pagination={false}
            options={false}
          />
        </Card>
      )}
    </Space>
  )
}
