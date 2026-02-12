import { useState, useMemo } from 'react'
import { Card, Select, Input, Button, Space, Slider, Descriptions, Typography, Empty, Row, Col } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community'
import ReactECharts from 'echarts-for-react'
import { getTicks, getBook } from '@/api/client'

ModuleRegistry.registerModules([AllCommunityModule])

const DATES = ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06']

export default function TickExplorer() {
  const { symbol = 'NVDA' } = useParams()
  const [date, setDate] = useState('2026-02-02')
  const [fromTs, setFromTs] = useState('2026-02-02T14:30:00Z')
  const [toTs, setToTs] = useState('2026-02-02T14:31:00Z')
  const [limit, setLimit] = useState(5000)
  const [searchTrigger, setSearchTrigger] = useState<object | null>(null)
  const [selectedTs, setSelectedTs] = useState<string | null>(null)

  const { data: tickData, isLoading } = useQuery({
    queryKey: ['ticks', symbol, date, fromTs, toTs, limit, searchTrigger],
    queryFn: () => getTicks({ symbol, date, from_ts: fromTs, to_ts: toTs, limit }),
    enabled: !!searchTrigger,
  })

  const { data: bookData } = useQuery({
    queryKey: ['book', symbol, date, selectedTs],
    queryFn: () => getBook({ symbol, date, ts: selectedTs! }),
    enabled: !!selectedTs,
  })

  // Transpose columnar → row data
  const { colDefs, rowData } = useMemo(() => {
    if (!tickData?.columns || !tickData.rows?.length) return { colDefs: [] as ColDef[], rowData: [] }
    const cols: ColDef[] = tickData.columns.map((c) => ({
      field: c,
      headerName: c,
      width: c === 'ts' ? 180 : c === 'action' || c === 'side' ? 70 : 110,
      valueFormatter: c === 'ts'
        ? (p: { value: number }) => p.value ? new Date(p.value).toISOString().replace('T', ' ').slice(0, 23) : ''
        : ['price', 'mid_price', 'spread', 'bid_px_00', 'ask_px_00'].includes(c)
          ? (p: { value: number }) => p.value?.toFixed?.(4) ?? ''
          : undefined,
    }))
    const rows = tickData.rows.map((row) => {
      const obj: Record<string, string | number> = {}
      tickData.columns.forEach((c, i) => { obj[c] = row[i] })
      return obj
    })
    return { colDefs: cols, rowData: rows }
  }, [tickData])

  // Book depth chart
  const bookOption = useMemo(() => {
    if (!bookData?.bids || !bookData?.asks) return null
    const bids = [...bookData.bids].reverse()
    const asks = bookData.asks
    const levels = [...bids.map((b) => b.px.toFixed(2)), ...asks.map((a) => a.px.toFixed(2))]
    const sizes = [...bids.map((b) => -b.sz), ...asks.map((a) => a.sz)]

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0]
          return `Price: $${p.name}<br/>Size: ${Math.abs(p.value).toLocaleString()}`
        },
      },
      grid: { left: 80, right: 30, top: 10, bottom: 30 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { formatter: (v: number) => Math.abs(v).toLocaleString() },
      },
      yAxis: { type: 'category' as const, data: levels },
      series: [
        {
          type: 'bar',
          data: sizes.map((v, i) => ({
            value: v,
            itemStyle: { color: i < bids.length ? '#26a69a' : '#ef5350' },
          })),
        },
      ],
    }
  }, [bookData])

  const handleSearch = () => setSearchTrigger({})

  const handleDateChange = (d: string) => {
    setDate(d)
    setFromTs(`${d}T14:30:00Z`)
    setToTs(`${d}T14:31:00Z`)
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
        <Card title={`Ticks: ${tickData.returned.toLocaleString()} / ${tickData.total_in_range.toLocaleString()}`} size="small">
          <div style={{ height: 400 }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={colDefs}
              theme="legacy"
              rowSelection="single"
              onRowClicked={(e) => {
                const ts = e.data?.ts
                if (ts) {
                  const isoTs = new Date(ts).toISOString()
                  setSelectedTs(isoTs)
                }
              }}
              headerHeight={32}
              rowHeight={28}
            />
          </div>
        </Card>
      )}

      {bookData && (
        <Row gutter={16}>
          <Col span={14}>
            <Card title="Order Book Depth" size="small">
              {bookOption && <ReactECharts option={bookOption} style={{ height: 350 }} />}
            </Card>
          </Col>
          <Col span={10}>
            <Card title="Event & Features" size="small">
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Time">
                  {new Date(bookData.ts).toISOString().replace('T', ' ').slice(0, 23)}
                </Descriptions.Item>
                <Descriptions.Item label="Action">{bookData.event.action}</Descriptions.Item>
                <Descriptions.Item label="Side">{bookData.event.side}</Descriptions.Item>
                <Descriptions.Item label="Depth">{bookData.event.depth}</Descriptions.Item>
                <Descriptions.Item label="Price">${bookData.event.price.toFixed(4)}</Descriptions.Item>
                <Descriptions.Item label="Size">{bookData.event.size}</Descriptions.Item>
              </Descriptions>
              {bookData.features && (
                <>
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12, marginBottom: 4 }}>
                    Book Features
                  </Typography.Text>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Mid">${bookData.features.mid_price.toFixed(4)}</Descriptions.Item>
                    <Descriptions.Item label="Spread">{bookData.features.spread.toFixed(4)}</Descriptions.Item>
                    <Descriptions.Item label="Imbalance">{bookData.features.imbalance.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Depth Bid">{bookData.features.depth_bid.toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="Depth Ask">{bookData.features.depth_ask.toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="Slope Bid">{bookData.features.book_slope_bid.toFixed(4)}</Descriptions.Item>
                    <Descriptions.Item label="Slope Ask">{bookData.features.book_slope_ask.toFixed(4)}</Descriptions.Item>
                  </Descriptions>
                </>
              )}
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

