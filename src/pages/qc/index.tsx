import { useState, useMemo } from 'react'
import { Card, Select, Space, Tag, Statistic, Row, Col } from 'antd'
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
    return {
      records: reports.reduce((s, r) => s + r.n_records, 0),
      seqGaps: reports.reduce((s, r) => s + r.n_seq_gaps, 0),
      bboCrossed: reports.reduce((s, r) => s + r.n_bbo_crossed, 0),
      alerts: alerts.length,
    }
  }, [reports, alerts])

  // Heatmap: symbol × date → health
  const heatmapOption = useMemo(() => {
    const dates = [...new Set(reports.map((r) => r.date))].sort()
    const syms = [...new Set(reports.map((r) => r.symbol))].sort()
    const data = reports.map((r) => {
      const health = r.n_bbo_crossed > 0 ? 2 : r.n_seq_gaps > 0 ? 1 : 0
      return [dates.indexOf(r.date), syms.indexOf(r.symbol), health]
    })
    return {
      tooltip: {
        formatter: (p: { data: number[] }) => {
          const r = reports.find(
            (r) => r.date === dates[p.data[0]] && r.symbol === syms[p.data[1]],
          )
          if (!r) return ''
          return `${r.symbol} ${r.date}<br/>Records: ${r.n_records.toLocaleString()}<br/>Seq Gaps: ${r.n_seq_gaps}<br/>BBO Crossed: ${r.n_bbo_crossed}`
        },
      },
      xAxis: { type: 'category' as const, data: dates },
      yAxis: { type: 'category' as const, data: syms },
      visualMap: {
        min: 0,
        max: 2,
        show: false,
        inRange: { color: ['#52c41a', '#faad14', '#ff4d4f'] },
      },
      series: [
        {
          type: 'heatmap',
          data,
          label: { show: false },
          itemStyle: { borderRadius: 4 },
        },
      ],
    }
  }, [reports])

  // Action distribution for all reports
  const ACTION_NAMES: Record<string, string> = {
    A: 'Add',
    C: 'Cancel',
    T: 'Trade',
    M: 'Modify',
    F: 'Fill',
    R: 'Reset',
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
      series: [
        {
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
        },
      ],
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
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small"><Statistic title="Total Records" value={totals.records} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Seq Gaps" value={totals.seqGaps} valueStyle={{ color: totals.seqGaps > 0 ? '#faad14' : '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="BBO Crossed" value={totals.bboCrossed} valueStyle={{ color: totals.bboCrossed > 0 ? '#ff4d4f' : '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Alerts" value={totals.alerts} valueStyle={{ color: totals.alerts > 0 ? '#ff4d4f' : '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="Health Matrix (Symbol × Date)" size="small">
            {reports.length > 0 && <ReactECharts option={heatmapOption} style={{ height: 300 }} />}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Action Distribution" size="small">
            {reports.length > 0 && <ReactECharts option={actionOption} style={{ height: 300 }} />}
          </Card>
        </Col>
      </Row>

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
            { title: 'Date', dataIndex: 'date', width: 110 },
            { title: 'Records', dataIndex: 'n_records', render: (_, r) => r.n_records.toLocaleString(), sorter: (a, b) => a.n_records - b.n_records },
            { title: 'Seq Gaps', dataIndex: 'n_seq_gaps', render: (_, r) => <Tag color={r.n_seq_gaps > 0 ? 'orange' : 'green'}>{r.n_seq_gaps}</Tag> },
            { title: 'BBO Crossed', dataIndex: 'n_bbo_crossed', render: (_, r) => <Tag color={r.n_bbo_crossed > 0 ? 'red' : 'green'}>{r.n_bbo_crossed}</Tag> },
            { title: 'BBO Locked', dataIndex: 'n_bbo_locked' },
            { title: 'Spread (mean)', dataIndex: 'spread_mean', render: (_, r) => r.spread_mean?.toFixed(4) },
            { title: 'Spread (median)', dataIndex: 'spread_median', render: (_, r) => r.spread_median?.toFixed(4) },
          ]}
          dataSource={reports}
          loading={isLoading}
          rowKey="id"
          search={false}
          pagination={false}
          options={false}
        />
      </Card>

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
