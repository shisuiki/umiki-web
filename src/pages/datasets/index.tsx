import { useState, useMemo } from 'react'
import { ProTable } from '@ant-design/pro-components'
import { Tag, Select, Space, Card, Descriptions, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getDatasets, getDataset } from '@/api/client'
import type { Dataset } from '@/types/api'
import type { ProColumns } from '@ant-design/pro-components'

const zoneColors: Record<string, string> = {
  raw: 'blue',
  canonical: 'cyan',
  derived: 'green',
  training: 'gold',
}

export default function DatasetsPage() {
  const [zoneFilter, setZoneFilter] = useState<string>()
  const [symbolFilter, setSymbolFilter] = useState<string>()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['datasets', zoneFilter, symbolFilter],
    queryFn: () =>
      getDatasets({
        ...(zoneFilter ? { zone: zoneFilter } : {}),
        ...(symbolFilter ? { symbol: symbolFilter } : {}),
      }),
  })

  const { data: detail } = useQuery({
    queryKey: ['dataset', selectedId],
    queryFn: () => getDataset(selectedId!),
    enabled: !!selectedId,
  })

  const symbols = useMemo(() => {
    const set = new Set(datasets.map((d) => d.symbol))
    return Array.from(set).sort()
  }, [datasets])

  const columns: ProColumns<Dataset>[] = [
    { title: 'Symbol', dataIndex: 'symbol', width: 100 },
    { title: 'Date', dataIndex: 'date', width: 120 },
    {
      title: 'Zone',
      dataIndex: 'zone',
      width: 100,
      render: (_, r) => <Tag color={zoneColors[r.zone]}>{r.zone}</Tag>,
    },
    { title: 'Dataset', dataIndex: 'dataset', width: 140 },
    {
      title: 'Records',
      dataIndex: 'n_records',
      width: 120,
      render: (_, r) => r.n_records?.toLocaleString(),
      sorter: (a, b) => a.n_records - b.n_records,
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      width: 100,
      render: (_, r) => formatBytes(r.file_size),
      sorter: (a, b) => a.file_size - b.file_size,
    },
    {
      title: 'Action',
      width: 80,
      render: (_, r) => <a onClick={() => setSelectedId(r.id)}>Detail</a>,
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <ProTable<Dataset>
        headerTitle="Datasets"
        columns={columns}
        dataSource={datasets}
        loading={isLoading}
        rowKey="id"
        search={false}
        pagination={{ pageSize: 50 }}
        toolBarRender={() => [
          <Select
            key="zone"
            placeholder="Zone"
            allowClear
            style={{ width: 140 }}
            value={zoneFilter}
            onChange={setZoneFilter}
            options={['raw', 'canonical', 'derived', 'training'].map((z) => ({
              label: z,
              value: z,
            }))}
          />,
          <Select
            key="symbol"
            placeholder="Symbol"
            allowClear
            style={{ width: 140 }}
            value={symbolFilter}
            onChange={setSymbolFilter}
            options={symbols.map((s) => ({ label: s, value: s }))}
          />,
        ]}
      />

      {detail && (
        <Card title={`${detail.symbol} / ${detail.date} / ${detail.zone}`} size="small">
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Dataset">{detail.dataset}</Descriptions.Item>
            <Descriptions.Item label="Zone">
              <Tag color={zoneColors[detail.zone]}>{detail.zone}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Records">{detail.n_records?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Size">{formatBytes(detail.file_size)}</Descriptions.Item>
            <Descriptions.Item label="Path" span={2}>
              <Typography.Text code copyable style={{ fontSize: 12 }}>
                {detail.file_path}
              </Typography.Text>
            </Descriptions.Item>
            {detail.sha256 && (
              <Descriptions.Item label="SHA256" span={2}>
                <Typography.Text code copyable style={{ fontSize: 11 }}>
                  {detail.sha256}
                </Typography.Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}
    </Space>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
