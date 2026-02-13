import { useState, useMemo } from 'react'
import { Card, Select, Input, Button, Space, Slider, Descriptions, Typography, Empty, Row, Col, Table, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef, themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community'
import ReactECharts from 'echarts-for-react'
import { getTicks } from '@/api/client'

ModuleRegistry.registerModules([AllCommunityModule])
const gridTheme = themeQuartz.withPart(colorSchemeDarkBlue)

const DATES = ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06']

const EVENT_COLS = ['ts', 'action', 'side', 'depth', 'price', 'size']
const BOOK_LEVELS = [0, 1, 2, 3, 4]
const FEATURE_KEYS = [
  'mid_price', 'spread', 'imbalance_l1', 'imbalance_l5', 'imbalance',
  'depth_bid', 'depth_ask', 'book_slope_bid', 'book_slope_ask',
  'r_value', 'delta_r', 'boundary_bid', 'boundary_ask',
]
const TRADE_KEYS = ['is_trade', 'trade_size', 'hidden_trade_sz']
const DELTA_KEYS = ['delta_mid_price', 'delta_spread', 'delta_bid_sz_00', 'delta_ask_sz_00']

export default function TickExplorer() {
  const { symbol = 'NVDA' } = useParams()
  const [date, setDate] = useState('2026-02-02')
  const [fromTs, setFromTs] = useState('2026-02-02T09:00:00Z')
  const [toTs, setToTs] = useState('2026-02-02T09:01:00Z')
  const [limit, setLimit] = useState(5000)
  const [searchTrigger, setSearchTrigger] = useState<object | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const { data: tickData, isLoading } = useQuery({
    queryKey: ['ticks', symbol, date, fromTs, toTs, limit, searchTrigger],
    queryFn: () => getTicks({ symbol, date, from_ts: fromTs, to_ts: toTs, limit }),
    enabled: !!searchTrigger,
  })

  // Transpose columnar → row data
  const allRows = useMemo(() => {
    if (!tickData?.columns || !tickData.rows?.length) return []
    return tickData.rows.map((row) => {
      const obj: Record<string, string | number> = {}
      tickData.columns.forEach((c, i) => { obj[c] = row[i] })
      return obj
    })
  }, [tickData])

  // Event table: only 6 core columns
  const eventColDefs: ColDef[] = useMemo(() => {
    if (!tickData?.columns) return []
    return EVENT_COLS.filter((c) => tickData.columns.includes(c)).map((c) => ({
      field: c,
      headerName: c,
      width: c === 'ts' ? 200 : c === 'action' || c === 'side' ? 80 : 110,
      valueFormatter: c === 'ts'
        ? (p: { value: number }) => p.value ? new Date(p.value).toISOString().replace('T', ' ').slice(0, 23) : ''
        : c === 'price'
          ? (p: { value: number }) => p.value?.toFixed?.(4) ?? ''
          : undefined,
    }))
  }, [tickData])

  const selectedRow = selectedIdx != null ? allRows[selectedIdx] : null

  // Book ladder from selected tick
  const bookLadder = useMemo(() => {
    if (!selectedRow) return []
    return BOOK_LEVELS.map((lvl) => ({
      level: lvl,
      bid_sz: selectedRow[`bid_sz_0${lvl}`] as number,
      bid_px: selectedRow[`bid_px_0${lvl}`] as number,
      ask_px: selectedRow[`ask_px_0${lvl}`] as number,
      ask_sz: selectedRow[`ask_sz_0${lvl}`] as number,
      bid_ct: lvl === 0 ? selectedRow['bid_ct_00'] as number : undefined,
      ask_ct: lvl === 0 ? selectedRow['ask_ct_00'] as number : undefined,
    }))
  }, [selectedRow])

  // Delta mid-price sparkline
  const deltaSparkOption = useMemo(() => {
    if (!allRows.length || !tickData?.columns.includes('delta_mid_price')) return null
    const data = allRows.map((r) => [r.ts as number, r.delta_mid_price as number])
    return {
      tooltip: { trigger: 'axis', formatter: (p: { data: [number, number] }[]) => {
        const d = p[0]?.data
        return d ? `${new Date(d[0]).toISOString().slice(11, 23)}<br/>δ Mid: ${d[1]?.toFixed(6)}` : ''
      }},
      grid: { left: 50, right: 15, top: 10, bottom: 25 },
      xAxis: { type: 'time' as const, axisLabel: { fontSize: 9 } },
      yAxis: { type: 'value' as const, scale: true, splitLine: { lineStyle: { color: '#333' } } },
      dataZoom: [{ type: 'inside' }],
      series: [{
        type: 'line',
        data,
        showSymbol: false,
        lineStyle: { width: 1, color: '#42a5f5' },
        areaStyle: { color: 'rgba(66,165,245,0.1)' },
      }],
    }
  }, [allRows, tickData])

  const handleSearch = () => { setSearchTrigger({}); setSelectedIdx(null) }
  const handleDateChange = (d: string) => {
    setDate(d)
    setFromTs(`${d}T09:00:00Z`)
    setToTs(`${d}T09:01:00Z`)
  }

  const fmtNum = (v: unknown, decimals = 4) => {
    if (v == null) return '—'
    const n = Number(v)
    return isNaN(n) ? String(v) : n.toFixed(decimals)
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card title={`Tick Explorer — ${symbol}`} size="small">
        <Space wrap>
          <Select value={date} onChange={handleDateChange} style={{ width: 140 }}
            options={DATES.map((d) => ({ label: d, value: d }))} />
          <Input value={fromTs} onChange={(e) => setFromTs(e.target.value)}
            style={{ width: 220 }} addonBefore="From" />
          <Input value={toTs} onChange={(e) => setToTs(e.target.value)}
            style={{ width: 220 }} addonBefore="To" />
          <span style={{ color: '#999' }}>Limit: {limit}</span>
          <Slider value={limit} onChange={setLimit} min={100} max={10000} step={100}
            style={{ width: 150 }} />
          <Button type="primary" icon={<SearchOutlined />} loading={isLoading}
            onClick={handleSearch}>Query</Button>
        </Space>
      </Card>

      {tickData && (
        <>
          <Card title={`Events: ${tickData.returned.toLocaleString()} / ${tickData.total_in_range.toLocaleString()}`} size="small">
            <div style={{ height: 350 }}>
              <AgGridReact
                rowData={allRows}
                columnDefs={eventColDefs}
                theme={gridTheme}
                rowSelection="single"
                onRowClicked={(e) => {
                  if (e.rowIndex != null) setSelectedIdx(e.rowIndex)
                }}
                headerHeight={32}
                rowHeight={28}
              />
            </div>
          </Card>

          {deltaSparkOption && (
            <Card title="δ Mid-Price" size="small">
              <ReactECharts option={deltaSparkOption} style={{ height: 150 }} />
            </Card>
          )}
        </>
      )}

      {selectedRow && (
        <Row gutter={16}>
          <Col span={10}>
            <Card title="Order Book (5 Levels)" size="small">
              <Table
                dataSource={bookLadder}
                rowKey="level"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Ct', dataIndex: 'bid_ct', width: 50, render: (v) => v ?? '', align: 'right' as const },
                  { title: 'Bid Sz', dataIndex: 'bid_sz', width: 80, render: (v) => v?.toLocaleString() ?? '', align: 'right' as const },
                  { title: 'Bid Px', dataIndex: 'bid_px', width: 90, render: (v) => <Typography.Text style={{ color: '#26a69a' }}>${fmtNum(v)}</Typography.Text>, align: 'right' as const },
                  { title: 'Ask Px', dataIndex: 'ask_px', width: 90, render: (v) => <Typography.Text style={{ color: '#ef5350' }}>${fmtNum(v)}</Typography.Text>, align: 'left' as const },
                  { title: 'Ask Sz', dataIndex: 'ask_sz', width: 80, render: (v) => v?.toLocaleString() ?? '', align: 'left' as const },
                  { title: 'Ct', dataIndex: 'ask_ct', width: 50, render: (v) => v ?? '', align: 'left' as const },
                ]}
              />
            </Card>
          </Col>
          <Col span={7}>
            <Card title="Features" size="small">
              <Descriptions bordered size="small" column={1}>
                {FEATURE_KEYS.map((k) => (
                  <Descriptions.Item key={k} label={k.replace(/_/g, ' ')}>
                    {fmtNum(selectedRow[k], k.includes('depth') || k.includes('boundary') ? 0 : 6)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          </Col>
          <Col span={7}>
            <Card title="Trade & Deltas" size="small">
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Time">
                  {new Date(selectedRow.ts as number).toISOString().replace('T', ' ').slice(0, 23)}
                </Descriptions.Item>
                {TRADE_KEYS.map((k) => (
                  <Descriptions.Item key={k} label={k.replace(/_/g, ' ')}>
                    {k === 'is_trade'
                      ? <Tag color={selectedRow[k] ? 'green' : 'default'}>{selectedRow[k] ? 'Yes' : 'No'}</Tag>
                      : fmtNum(selectedRow[k], 0)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12, marginBottom: 4 }}>
                Deltas (vs previous tick)
              </Typography.Text>
              <Descriptions bordered size="small" column={1}>
                {DELTA_KEYS.map((k) => (
                  <Descriptions.Item key={k} label={k.replace('delta_', 'δ ').replace(/_/g, ' ')}>
                    {fmtNum(selectedRow[k], 6)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          </Col>
        </Row>
      )}

      {!tickData && !isLoading && (
        <Empty description="Set time range and click Query" />
      )}
    </Space>
  )
}
