import { useState } from 'react'
import { Card, Button, Space, Descriptions, Tag, Typography, Table, Empty, message } from 'antd'
import { ProFormSelect, ModalForm } from '@ant-design/pro-components'
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExportManifest, triggerExport } from '@/api/client'
import type { TrainingShard } from '@/types/api'
import type { ColumnsType } from 'antd/es/table'

export default function ExportPage() {
  const queryClient = useQueryClient()
  const [selectedShard, setSelectedShard] = useState<TrainingShard | null>(null)

  const { data: manifest, isLoading } = useQuery({
    queryKey: ['export-manifest'],
    queryFn: getExportManifest,
  })

  const exportMutation = useMutation({
    mutationFn: triggerExport,
    onSuccess: (data) => {
      message.success(`Export triggered: ${data.symbols.join(', ')}`)
      queryClient.invalidateQueries({ queryKey: ['export-manifest'] })
    },
    onError: () => message.error('Export failed'),
  })

  const shardColumns: ColumnsType<TrainingShard> = [
    { title: 'Symbol', dataIndex: 'symbol', width: 80 },
    { title: 'Date', dataIndex: 'date', width: 110 },
    {
      title: 'Samples',
      dataIndex: 'n_samples',
      width: 100,
      render: (v: number) => v?.toLocaleString(),
      sorter: (a, b) => a.n_samples - b.n_samples,
    },
    { title: 'Features', dataIndex: 'n_features', width: 80 },
    { title: 'Labels', dataIndex: 'n_labels', width: 70 },
    {
      title: 'Size',
      dataIndex: 'file_size_bytes',
      width: 100,
      render: (v: number) => formatBytes(v),
      sorter: (a, b) => a.file_size_bytes - b.file_size_bytes,
    },
    {
      title: 'Action',
      width: 80,
      render: (_, r) => <a onClick={() => setSelectedShard(r)}>Detail</a>,
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card
        title="Training Export"
        size="small"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['export-manifest'] })}
            />
            <ModalForm
              title="Trigger Export"
              trigger={<Button type="primary" icon={<ExportOutlined />}>Export</Button>}
              onFinish={async (values) => {
                await exportMutation.mutateAsync({
                  dataset: 'XNAS.ITCH',
                  symbols: values.symbols,
                  force: true,
                })
                return true
              }}
            >
              <ProFormSelect
                name="symbols"
                label="Symbols"
                mode="multiple"
                options={['NVDA', 'AAPL', 'AMZN', 'MSFT'].map((s) => ({
                  label: s,
                  value: s,
                }))}
                initialValue={['NVDA']}
              />
            </ModalForm>
          </Space>
        }
      >
        {manifest ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={4}>
              <Descriptions.Item label="Dataset">{manifest.config.dataset}</Descriptions.Item>
              <Descriptions.Item label="Total Shards">{manifest.total_shards}</Descriptions.Item>
              <Descriptions.Item label="Total Samples">{manifest.total_samples.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Created">{manifest.created_at}</Descriptions.Item>
            </Descriptions>

            <Space wrap>
              <Typography.Text type="secondary">Features:</Typography.Text>
              {manifest.config.features.map((f) => (
                <Tag key={f}>{f}</Tag>
              ))}
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>Labels:</Typography.Text>
              {manifest.config.labels.map((l) => (
                <Tag key={l} color="blue">{l}</Tag>
              ))}
            </Space>
          </Space>
        ) : (
          !isLoading && <Empty description="No manifest available. Trigger an export first." />
        )}
      </Card>

      {manifest?.shards && (
        <Card title={`Shards (${manifest.shards.length})`} size="small">
          <Table<TrainingShard>
            columns={shardColumns}
            dataSource={manifest.shards}
            rowKey={(r) => `${r.symbol}-${r.date}`}
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {selectedShard && (
        <Card title={`Shard: ${selectedShard.symbol} / ${selectedShard.date}`} size="small">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Dataset">{selectedShard.dataset}</Descriptions.Item>
            <Descriptions.Item label="Symbol">{selectedShard.symbol}</Descriptions.Item>
            <Descriptions.Item label="Date">{selectedShard.date}</Descriptions.Item>
            <Descriptions.Item label="Samples">{selectedShard.n_samples.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Features">{selectedShard.n_features}</Descriptions.Item>
            <Descriptions.Item label="Labels">{selectedShard.n_labels}</Descriptions.Item>
            <Descriptions.Item label="Size">{formatBytes(selectedShard.file_size_bytes)}</Descriptions.Item>
            <Descriptions.Item label="Path" span={2}>
              <Typography.Text code copyable style={{ fontSize: 11 }}>
                {selectedShard.output_path}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Hash" span={2}>
              <Typography.Text code copyable style={{ fontSize: 11 }}>
                {selectedShard.shard_hash}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  )
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
