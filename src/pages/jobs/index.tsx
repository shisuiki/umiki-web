import { useState } from 'react'
import { ProTable, ModalForm, ProFormSelect, ProFormCheckbox } from '@ant-design/pro-components'
import { Button, Tag, Drawer, Typography, Space, Descriptions, Alert, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobs, getJob, createJob } from '@/api/client'
import type { Job, JobCreateRequest } from '@/types/api'
import type { ProColumns } from '@ant-design/pro-components'

const statusColors: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
}

export default function JobsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    refetchInterval: 5000,
  })

  const { data: jobDetail } = useQuery({
    queryKey: ['job', selectedJobId],
    queryFn: () => getJob(selectedJobId!),
    enabled: !!selectedJobId,
    refetchInterval: (query) =>
      query.state.data?.status === 'running' ? 2000 : false,
  })

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      message.success('Job created')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: () => message.error('Failed to create job'),
  })

  const columns: ProColumns<Job>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (_, r) => <Tag color={statusColors[r.status]}>{r.status}</Tag>,
      filters: true,
      valueEnum: {
        pending: { text: 'Pending' },
        running: { text: 'Running' },
        completed: { text: 'Completed' },
        failed: { text: 'Failed' },
      },
    },
    {
      title: 'Stages',
      dataIndex: 'stages',
      render: (_, r) => r.stages?.map((s) => <Tag key={s}>{s}</Tag>),
    },
    { title: 'Created', dataIndex: 'created_at', valueType: 'dateTime', width: 180 },
    { title: 'Finished', dataIndex: 'finished_at', valueType: 'dateTime', width: 180 },
    {
      title: 'Action',
      width: 80,
      render: (_, r) => <a onClick={() => setSelectedJobId(r.id)}>Detail</a>,
    },
  ]

  return (
    <>
      <ProTable<Job>
        headerTitle="Pipeline Jobs"
        columns={columns}
        dataSource={jobs}
        loading={isLoading}
        rowKey="id"
        search={false}
        pagination={{ pageSize: 20 }}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['jobs'] })}
          />,
          <ModalForm<JobCreateRequest>
            key="new"
            title="New Pipeline Job"
            trigger={<Button type="primary" icon={<PlusOutlined />}>New Job</Button>}
            onFinish={async (values) => {
              await createMutation.mutateAsync(values)
              return true
            }}
          >
            <ProFormSelect
              name="symbols"
              label="Symbols"
              mode="tags"
              placeholder="e.g. NVDA, AAPL"
              options={['NVDA', 'AAPL', 'AMZN', 'MSFT', 'GOOGL', 'META', 'TSLA', 'AMD', 'AVGO', 'NFLX'].map(
                (s) => ({ label: s, value: s }),
              )}
            />
            <ProFormCheckbox.Group
              name="stages"
              label="Stages"
              options={['download', 'decode', 'derive', 'qc', 'export']}
              initialValue={['download', 'decode', 'derive', 'qc']}
            />
          </ModalForm>,
        ]}
      />

      <Drawer
        title={`Job ${selectedJobId ?? ''}`}
        open={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
        width={500}
      >
        {jobDetail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Status">
                <Tag color={statusColors[jobDetail.status]}>{jobDetail.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Stages">
                {jobDetail.stages?.map((s) => <Tag key={s}>{s}</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="Spec">{jobDetail.spec_path ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Created">{jobDetail.created_at}</Descriptions.Item>
              <Descriptions.Item label="Started">{jobDetail.started_at ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Finished">{jobDetail.finished_at ?? '-'}</Descriptions.Item>
            </Descriptions>
            {jobDetail.error && (
              <Alert type="error" message="Error" description={<Typography.Text code>{jobDetail.error}</Typography.Text>} />
            )}
          </Space>
        )}
      </Drawer>
    </>
  )
}
