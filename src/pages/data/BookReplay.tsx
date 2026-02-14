import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Card, Select, Input, Button, Space, Slider, Tag, Typography, Row, Col, Descriptions, Statistic, Empty } from 'antd'
import { SearchOutlined, CaretLeftOutlined, CaretRightOutlined, PauseOutlined, CaretRightFilled } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getReplay } from '@/api/client'
import type { ReplayFrame } from '@/types/api'

const DATES = ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06']

const ACTION_COLORS: Record<string, string> = { A: '#42a5f5', C: '#ffa726', T: '#26a69a', M: '#ab47bc' }

export default function BookReplay() {
  const { symbol = 'NVDA' } = useParams()
  const [date, setDate] = useState('2026-02-02')
  const [fromTs, setFromTs] = useState('2026-02-02T14:30:00Z')
  const [toTs, setToTs] = useState('2026-02-02T14:30:10Z')
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [trigger, setTrigger] = useState<object | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(200) // ms per frame
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: replay, isLoading } = useQuery({
    queryKey: ['replay', symbol, date, fromTs, toTs, offset, limit, trigger],
    queryFn: () => getReplay({ symbol, date, from_ts: fromTs, to_ts: toTs, offset, limit }),
    enabled: !!trigger,
  })

  const frames = replay?.frames ?? []
  const frame: ReplayFrame | null = frames[frameIdx] ?? null

  const handleDateChange = (d: string) => {
    setDate(d)
    setFromTs(`${d}T14:30:00Z`)
    setToTs(`${d}T14:30:10Z`)
  }

  const handleSearch = () => { setTrigger({}); setFrameIdx(0); setOffset(0); setPlaying(false) }

  const goNext = useCallback(() => {
    setFrameIdx((prev) => {
      if (prev < frames.length - 1) return prev + 1
      // Auto-load next page
      if (replay?.has_more) {
        setOffset((o) => o + limit)
        setTrigger({})
        return 0
      }
      setPlaying(false)
      return prev
    })
  }, [frames.length, replay?.has_more, limit])

  const goPrev = () => {
    setFrameIdx((prev) => Math.max(prev - 1, 0))
    setPlaying(false)
  }

  // Playback timer
  useEffect(() => {
    if (playing && frames.length > 0) {
      timerRef.current = setInterval(goNext, speed)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, speed, goNext, frames.length])

  // Max depth for bar scaling
  const maxSz = useMemo(() => {
    if (!frame) return 1
    const all = [...frame.bids, ...frame.asks].map((l) => l.sz)
    return Math.max(...all, 1)
  }, [frame])

  const fmtTs = (ts: number) => new Date(ts).toISOString().replace('T', ' ').slice(0, 23)
  const fmtK = (v: number) => v >= 10000 ? (v / 1000).toFixed(0) + 'K' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(v)

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card title={`Book Replay — ${symbol}`} size="small">
        <Space wrap>
          <Select value={date} onChange={handleDateChange} style={{ width: 140 }}
            options={DATES.map((d) => ({ label: d, value: d }))} />
          <Input value={fromTs} onChange={(e) => setFromTs(e.target.value)}
            style={{ width: 220 }} addonBefore="From" />
          <Input value={toTs} onChange={(e) => setToTs(e.target.value)}
            style={{ width: 220 }} addonBefore="To" />
          <span style={{ color: '#999', fontSize: 12 }}>Limit: {limit}</span>
          <Slider value={limit} onChange={(v) => setLimit(v)} min={10} max={200} step={10}
            style={{ width: 100 }} />
          <Button type="primary" icon={<SearchOutlined />} loading={isLoading}
            onClick={handleSearch}>Query</Button>
        </Space>
      </Card>

      {replay && frames.length > 0 && (
        <>
          {/* Playback controls */}
          <Card size="small">
            <Space align="center" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Space>
                <Button icon={<CaretLeftOutlined />} onClick={goPrev} disabled={frameIdx === 0 && offset === 0} />
                <Button
                  icon={playing ? <PauseOutlined /> : <CaretRightFilled />}
                  type={playing ? 'default' : 'primary'}
                  onClick={() => setPlaying(!playing)}
                />
                <Button icon={<CaretRightOutlined />} onClick={goNext} disabled={frameIdx >= frames.length - 1 && !replay.has_more} />
                <Tag>{frameIdx + 1 + offset} / {replay.total_in_range.toLocaleString()}</Tag>
                {frame && <Typography.Text code>{fmtTs(frame.ts)}</Typography.Text>}
              </Space>
              <Space>
                <span style={{ color: '#999', fontSize: 12 }}>Speed</span>
                <Slider value={speed} onChange={setSpeed} min={20} max={1000} step={20}
                  style={{ width: 120 }} reverse />
                <span style={{ color: '#999', fontSize: 12 }}>{speed}ms</span>
              </Space>
            </Space>
          </Card>

          {frame && (
            <>
              {/* Event info */}
              <Card size="small">
                <Space>
                  <Tag color={ACTION_COLORS[frame.event.action] ?? '#78909c'}>{frame.event.action}</Tag>
                  <Tag>{frame.event.side}</Tag>
                  <span>depth={frame.event.depth}</span>
                  <span>px=${frame.event.price.toFixed(4)}</span>
                  <span>sz={frame.event.size}</span>
                  <Typography.Text type="secondary">|</Typography.Text>
                  <span>mid=${frame.mid_price.toFixed(4)}</span>
                  <span>spread={frame.spread.toFixed(4)}</span>
                  <span>imb={frame.imbalance.toFixed(4)}</span>
                </Space>
              </Card>

              <Row gutter={16}>
                {/* Bid depth bars */}
                <Col span={8}>
                  <Card title="Bids" size="small" styles={{ body: { padding: '8px 12px' } }}>
                    {frame.bids.map((lvl, i) => {
                      const pct = (lvl.sz / maxSz) * 100
                      const hasDelta = lvl.delta_sz !== 0
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', height: 22, marginBottom: 2,
                          border: hasDelta ? '1px solid #ffa726' : '1px solid transparent',
                          borderRadius: 3,
                        }}>
                          <span style={{ width: 70, fontSize: 11, textAlign: 'right', paddingRight: 6, color: '#26a69a' }}>
                            ${lvl.px.toFixed(2)}
                          </span>
                          <div style={{ flex: 1, direction: 'rtl' }}>
                            <div style={{
                              width: `${pct}%`, height: 16, background: 'rgba(38,166,154,0.5)',
                              borderRadius: 2, minWidth: lvl.sz > 0 ? 2 : 0,
                            }} />
                          </div>
                          <span style={{ width: 50, fontSize: 11, textAlign: 'right', paddingRight: 4 }}>
                            {fmtK(lvl.sz)}
                          </span>
                          {hasDelta && (
                            <span style={{ width: 45, fontSize: 10, color: lvl.delta_sz > 0 ? '#26a69a' : '#ef5350', textAlign: 'right' }}>
                              {lvl.delta_sz > 0 ? '+' : ''}{fmtK(lvl.delta_sz)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </Card>
                </Col>

                {/* Ask depth bars */}
                <Col span={8}>
                  <Card title="Asks" size="small" styles={{ body: { padding: '8px 12px' } }}>
                    {frame.asks.map((lvl, i) => {
                      const pct = (lvl.sz / maxSz) * 100
                      const hasDelta = lvl.delta_sz !== 0
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', height: 22, marginBottom: 2,
                          border: hasDelta ? '1px solid #ffa726' : '1px solid transparent',
                          borderRadius: 3,
                        }}>
                          <span style={{ width: 70, fontSize: 11, paddingLeft: 4, color: '#ef5350' }}>
                            ${lvl.px.toFixed(2)}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              width: `${pct}%`, height: 16, background: 'rgba(239,83,80,0.5)',
                              borderRadius: 2, minWidth: lvl.sz > 0 ? 2 : 0,
                            }} />
                          </div>
                          <span style={{ width: 50, fontSize: 11, textAlign: 'right', paddingRight: 4 }}>
                            {fmtK(lvl.sz)}
                          </span>
                          {hasDelta && (
                            <span style={{ width: 45, fontSize: 10, color: lvl.delta_sz > 0 ? '#26a69a' : '#ef5350', textAlign: 'right' }}>
                              {lvl.delta_sz > 0 ? '+' : ''}{fmtK(lvl.delta_sz)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </Card>
                </Col>

                {/* Star Graph R panel */}
                <Col span={8}>
                  <Card title="Star Graph R" size="small">
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <Statistic
                          title="R Value"
                          value={frame.star_graph.r_value.toFixed(2)}
                          valueStyle={{ fontSize: 20, color: '#7c4dff' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Delta R"
                          value={frame.star_graph.delta_r.toFixed(2)}
                          valueStyle={{ fontSize: 20, color: frame.star_graph.delta_r > 0 ? '#26a69a' : frame.star_graph.delta_r < 0 ? '#ef5350' : '#999' }}
                        />
                      </Col>
                    </Row>
                    <Descriptions bordered size="small" column={1} style={{ marginTop: 12 }}>
                      <Descriptions.Item label="Hidden Trade Sz">
                        {frame.star_graph.hidden_trade_sz > 0
                          ? <Tag color="orange">{frame.star_graph.hidden_trade_sz}</Tag>
                          : <span style={{ color: '#666' }}>0</span>}
                      </Descriptions.Item>
                      <Descriptions.Item label="Boundary Bid">
                        <span style={{ color: '#26a69a' }}>{frame.star_graph.boundary_bid.toFixed(2)}</span>
                      </Descriptions.Item>
                      <Descriptions.Item label="Boundary Ask">
                        <span style={{ color: '#ef5350' }}>{frame.star_graph.boundary_ask.toFixed(2)}</span>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </>
      )}

      {!replay && !isLoading && (
        <Empty description="Set time range and click Query" />
      )}
    </Space>
  )
}
