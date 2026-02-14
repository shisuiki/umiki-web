import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, Select, Input, Button, Space, Slider, Tag, Typography, Empty } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getHeatmap } from '@/api/client'

const DATES = ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06']

export default function BookHeatmap() {
  const { symbol = 'NVDA' } = useParams()
  const [date, setDate] = useState('2026-02-02')
  const [fromTs, setFromTs] = useState('2026-02-02T14:30:00Z')
  const [toTs, setToTs] = useState('2026-02-02T14:35:00Z')
  const [maxSamples, setMaxSamples] = useState(2000)
  const [priceRange, setPriceRange] = useState(20)
  const [trigger, setTrigger] = useState<object | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: heatmap, isLoading } = useQuery({
    queryKey: ['heatmap', symbol, date, fromTs, toTs, maxSamples, priceRange, trigger],
    queryFn: () => getHeatmap({ symbol, date, from_ts: fromTs, to_ts: toTs, max_samples: maxSamples, price_range: priceRange }),
    enabled: !!trigger,
  })

  const handleDateChange = (d: string) => {
    setDate(d)
    setFromTs(`${d}T14:30:00Z`)
    setToTs(`${d}T14:35:00Z`)
  }

  const handleSearch = () => { setTrigger({}) }

  // Canvas rendering
  const renderHeatmap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !heatmap?.depth?.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { timestamps, offsets, depth, trades } = heatmap
    const nCols = timestamps.length
    const nRows = offsets.length
    if (!nCols || !nRows) return

    const dpr = window.devicePixelRatio || 1
    const displayW = canvas.clientWidth
    const displayH = canvas.clientHeight
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    ctx.scale(dpr, dpr)

    const margin = { top: 20, right: 20, bottom: 30, left: 50 }
    const w = displayW - margin.left - margin.right
    const h = displayH - margin.top - margin.bottom
    const cellW = w / nCols
    const cellH = h / nRows

    // Find max depth for normalization
    let maxDepth = 0
    for (let r = 0; r < nRows; r++)
      for (let c = 0; c < nCols; c++)
        if (depth[r]?.[c] > maxDepth) maxDepth = depth[r][c]
    if (maxDepth === 0) maxDepth = 1

    ctx.clearRect(0, 0, displayW, displayH)
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, displayW, displayH)

    // Draw heatmap cells
    const midRow = offsets.indexOf(0)
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const val = depth[r]?.[c] ?? 0
        if (val === 0) continue
        const intensity = Math.min(val / maxDepth, 1)
        const alpha = 0.15 + intensity * 0.85
        // Bids: negative offset (below mid) = green, Asks: positive = red
        const isBid = offsets[r] < 0
        const isMid = offsets[r] === 0
        if (isMid) {
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.3})`
        } else if (isBid) {
          ctx.fillStyle = `rgba(38,166,154,${alpha})`
        } else {
          ctx.fillStyle = `rgba(239,83,80,${alpha})`
        }
        ctx.fillRect(
          margin.left + c * cellW,
          margin.top + r * cellH,
          Math.ceil(cellW),
          Math.ceil(cellH),
        )
      }
    }

    // Draw mid-price line
    if (midRow >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      const y = margin.top + midRow * cellH + cellH / 2
      ctx.beginPath()
      ctx.moveTo(margin.left, y)
      ctx.lineTo(margin.left + w, y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw trade markers
    trades?.forEach((t) => {
      const cIdx = t.sample_idx
      const rIdx = offsets.indexOf(t.price_offset)
      if (cIdx < 0 || cIdx >= nCols || rIdx < 0) return
      const cx = margin.left + (cIdx + 0.5) * cellW
      const cy = margin.top + (rIdx + 0.5) * cellH
      const radius = Math.min(Math.max(Math.sqrt(t.size) * 0.3, 2), 6)
      ctx.fillStyle = t.side === 'B' ? '#ffffff' : '#ffeb3b'
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    // Y-axis labels (price offsets)
    ctx.fillStyle = '#999'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    const labelStep = Math.max(1, Math.floor(nRows / 15))
    for (let r = 0; r < nRows; r += labelStep) {
      const y = margin.top + (r + 0.5) * cellH + 3
      ctx.fillText(String(offsets[r]), margin.left - 4, y)
    }

    // X-axis labels (time)
    ctx.textAlign = 'center'
    const tLabelStep = Math.max(1, Math.floor(nCols / 10))
    for (let c = 0; c < nCols; c += tLabelStep) {
      const x = margin.left + (c + 0.5) * cellW
      const label = new Date(timestamps[c]).toISOString().slice(11, 19)
      ctx.fillText(label, x, displayH - 8)
    }
  }, [heatmap])

  useEffect(() => { renderHeatmap() }, [renderHeatmap])

  // Resize handling
  useEffect(() => {
    const handleResize = () => renderHeatmap()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderHeatmap])

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card title={`Book Heatmap — ${symbol}`} size="small">
        <Space wrap>
          <Select value={date} onChange={handleDateChange} style={{ width: 140 }}
            options={DATES.map((d) => ({ label: d, value: d }))} />
          <Input value={fromTs} onChange={(e) => setFromTs(e.target.value)}
            style={{ width: 220 }} addonBefore="From" />
          <Input value={toTs} onChange={(e) => setToTs(e.target.value)}
            style={{ width: 220 }} addonBefore="To" />
          <span style={{ color: '#999', fontSize: 12 }}>Samples: {maxSamples}</span>
          <Slider value={maxSamples} onChange={setMaxSamples} min={200} max={5000} step={200}
            style={{ width: 120 }} />
          <span style={{ color: '#999', fontSize: 12 }}>Range: {priceRange}</span>
          <Slider value={priceRange} onChange={setPriceRange} min={5} max={50} step={5}
            style={{ width: 100 }} />
          <Button type="primary" icon={<SearchOutlined />} loading={isLoading}
            onClick={handleSearch}>Query</Button>
        </Space>
      </Card>

      {heatmap && (
        <Card size="small">
          <Space style={{ marginBottom: 8 }}>
            <Tag>{heatmap.n_samples.toLocaleString()} samples</Tag>
            <Tag>{heatmap.trades?.length ?? 0} trades</Tag>
            <Tag>range: {heatmap.price_range} ticks</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Bid (green) | Ask (red) | Trade (dot)
            </Typography.Text>
          </Space>
          <div style={{ width: '100%', height: 500, position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </Card>
      )}

      {!heatmap && !isLoading && (
        <Empty description="Set time range and click Query" />
      )}
    </Space>
  )
}
