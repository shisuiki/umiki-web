import { useState } from 'react'
import { Card, Select, InputNumber, Button, Space, Typography, Descriptions, Tag, Empty } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef, themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community'

const gridTheme = themeQuartz.withPart(colorSchemeDarkBlue)
import ReactECharts from 'echarts-for-react'
import { getAuditSample, getAuditValidate } from '@/api/client'
import type { BookLevel } from '@/types/api'

ModuleRegistry.registerModules([AllCommunityModule])

const DATASET = 'XNAS.ITCH'
const SYMBOLS = ['NVDA', 'AAPL', 'AMZN', 'MSFT']

export default function AuditPage() {
  const [symbol, setSymbol] = useState('NVDA')
  const [date, setDate] = useState('2026-02-02')
  const [n, setN] = useState(10)
  const [seed, setSeed] = useState(42)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [searchParams, setSearchParams] = useState<{
    dataset: string; symbol: string; date: string; n: number; seed: number
  } | null>(null)

  const { data: sampleData, isLoading } = useQuery({
    queryKey: ['audit-sample', searchParams],
    queryFn: () => getAuditSample(searchParams!),
    enabled: !!searchParams,
  })

  const { data: validateData } = useQuery({
    queryKey: ['audit-validate', searchParams?.symbol, searchParams?.date],
    queryFn: () =>
      getAuditValidate({
        dataset: DATASET,
        symbol: searchParams!.symbol,
        date: searchParams!.date,
      }),
    enabled: !!searchParams,
  })

  const handleSearch = () => {
    setSearchParams({ dataset: DATASET, symbol, date, n, seed })
    setCurrentIdx(0)
  }

  const snapshot = sampleData?.snapshots?.[currentIdx]

  // Build order book grid rows: Level 1-10
  const bookRows = snapshot
    ? Array.from({ length: Math.max(snapshot.bids.length, snapshot.asks.length) }, (_, i) => ({
        level: i + 1,
        bid_ct: snapshot.bids[i]?.ct ?? '',
        bid_sz: snapshot.bids[i]?.sz ?? '',
        bid_px: snapshot.bids[i]?.px ?? '',
        ask_px: snapshot.asks[i]?.px ?? '',
        ask_sz: snapshot.asks[i]?.sz ?? '',
        ask_ct: snapshot.asks[i]?.ct ?? '',
      }))
    : []

  const bookColDefs: ColDef[] = [
    { field: 'level', headerName: 'Level', width: 70, pinned: 'left' },
    { field: 'bid_ct', headerName: 'Bid Count', width: 90 },
    { field: 'bid_sz', headerName: 'Bid Size', width: 100 },
    {
      field: 'bid_px',
      headerName: 'Bid Price',
      width: 120,
      cellStyle: { color: '#52c41a', fontWeight: 'bold' },
    },
    {
      field: 'ask_px',
      headerName: 'Ask Price',
      width: 120,
      cellStyle: { color: '#ff4d4f', fontWeight: 'bold' },
    },
    { field: 'ask_sz', headerName: 'Ask Size', width: 100 },
    { field: 'ask_ct', headerName: 'Ask Count', width: 90 },
  ]

  // Depth chart: bid/ask size by level
  const depthOption = snapshot
    ? {
        tooltip: { trigger: 'axis' as const },
        legend: { data: ['Bid Size', 'Ask Size'] },
        xAxis: {
          type: 'category' as const,
          data: snapshot.bids.map((_: BookLevel, i: number) => `L${i + 1}`),
        },
        yAxis: { type: 'value' as const },
        series: [
          {
            name: 'Bid Size',
            type: 'bar',
            data: snapshot.bids.map((b: BookLevel) => b.sz),
            itemStyle: { color: '#52c41a' },
          },
          {
            name: 'Ask Size',
            type: 'bar',
            data: snapshot.asks.map((a: BookLevel) => a.sz),
            itemStyle: { color: '#ff4d4f' },
          },
        ],
      }
    : null

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card title="Audit Inspection" size="small">
        <Space wrap>
          <Select
            value={symbol}
            onChange={setSymbol}
            style={{ width: 120 }}
            options={SYMBOLS.map((s) => ({ label: s, value: s }))}
          />
          <Select
            value={date}
            onChange={setDate}
            style={{ width: 140 }}
            options={[
              '2026-02-02',
              '2026-02-03',
              '2026-02-04',
              '2026-02-05',
              '2026-02-06',
            ].map((d) => ({ label: d, value: d }))}
          />
          <InputNumber value={n} onChange={(v) => setN(v ?? 10)} min={1} max={50} addonBefore="n" />
          <InputNumber value={seed} onChange={(v) => setSeed(v ?? 42)} min={0} addonBefore="seed" />
          <Button type="primary" icon={<SearchOutlined />} loading={isLoading} onClick={handleSearch}>
            Sample
          </Button>
        </Space>
      </Card>

      {sampleData && snapshot ? (
        <>
          <Card
            title={
              <Space>
                <span>Snapshot {currentIdx + 1} / {sampleData.n_samples}</span>
                <Button size="small" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)}>
                  Prev
                </Button>
                <Button
                  size="small"
                  disabled={currentIdx >= sampleData.n_samples - 1}
                  onClick={() => setCurrentIdx((i) => i + 1)}
                >
                  Next
                </Button>
              </Space>
            }
            size="small"
            extra={
              <Descriptions size="small" column={3}>
                <Descriptions.Item label="Record">{snapshot.record_index.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Time">{snapshot.ts_event}</Descriptions.Item>
                <Descriptions.Item label="Action">
                  <Tag>{snapshot.action}</Tag>
                </Descriptions.Item>
              </Descriptions>
            }
          >
            {snapshot.bids.length > 0 && snapshot.asks.length > 0 && (
              <Typography.Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                Mid: {((snapshot.bids[0].px + snapshot.asks[0].px) / 2).toFixed(4)} | Spread:{' '}
                {(snapshot.asks[0].px - snapshot.bids[0].px).toFixed(4)}
              </Typography.Text>
            )}
            <div style={{ height: 350 }}>
              <AgGridReact
                rowData={bookRows}
                columnDefs={bookColDefs}
                theme={gridTheme}
                domLayout="autoHeight"
                headerHeight={32}
                rowHeight={30}
                getRowStyle={(params) =>
                  params.data?.level === 1
                    ? { background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }
                    : undefined
                }
              />
            </div>
          </Card>

          {depthOption && (
            <Card title="Depth Chart" size="small">
              <ReactECharts option={depthOption} style={{ height: 250 }} />
            </Card>
          )}

          {validateData && (
            <Card title="Validation" size="small">
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Total Records">{validateData.total_records.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Sample Size">{validateData.sample_size.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Trade BBO Unchanged">
                  <Tag color={validateData.trade_bbo_unchanged_pct > 99 ? 'green' : 'orange'}>
                    {validateData.trade_bbo_unchanged_pct.toFixed(2)}%
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Group A Proper Order">
                  <Tag color={validateData.group_a_proper_order_pct > 99 ? 'green' : 'orange'}>
                    {validateData.group_a_proper_order_pct.toFixed(2)}%
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </>
      ) : (
        !isLoading && <Empty description="Select parameters and click Sample" />
      )}
    </Space>
  )
}
