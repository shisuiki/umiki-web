// API response types derived from backend spec

export interface Job {
  id: string
  status: 'pending' | 'running' | 'completed' | 'done' | 'failed'
  stages: string[] | string
  spec_path?: string
  created_at: string
  started_at?: string
  finished_at?: string
  error?: string
}

export interface JobCreateRequest {
  spec?: string
  stages?: string[]
  symbols?: string[]
  extended?: boolean
  force?: boolean
}

export interface Dataset {
  id: string
  dataset: string
  symbol: string
  date: string
  zone: 'raw' | 'canonical' | 'derived' | 'training'
  file_path?: string
  n_records: number
  file_size: number
  sha256?: string
}

export interface QCReport {
  id: string
  dataset: string
  symbol: string
  date: string
  n_records: number
  n_trades: number
  n_bbo_crossed: number
  n_bbo_locked: number
  spread_mean: number
  spread_median: number
  n_iceberg_refills: number
  iceberg_pct: number
  n_mid_spread: number
  mid_spread_pct: number
  avg_r_mean: number
  r_std_mean: number
  hidden_trade_volume_mean: number
  action_dist: Record<string, number>
  alerts: string[]
}

export interface QCAlert {
  level: 'info' | 'warning' | 'error'
  symbol: string
  date: string
  message: string
}

export interface BookLevel {
  px: number
  sz: number
  ct: number
}

export interface AuditSnapshot {
  record_index: number
  ts_event: string
  action: string
  side: string
  depth: number
  price: number
  size: number
  bids: BookLevel[]
  asks: BookLevel[]
}

export interface AuditSampleResponse {
  dataset: string
  symbol: string
  date: string
  total_records: number
  n_samples: number
  snapshots: AuditSnapshot[]
}

export interface AuditValidateResponse {
  total_records: number
  sample_size: number
  trade_bbo_unchanged_pct: number
  group_a_proper_order_pct: number
}

export interface ExportRequest {
  dataset: string
  symbols: string[]
  force?: boolean
}

export interface ExportResponse {
  status: string
  dataset: string
  symbols: string[]
}

export interface TrainingManifest {
  created_at: string
  config: {
    dataset: string
    symbols: string[]
    features: string[]
    labels: string[]
  }
  shards: TrainingShard[]
  raw_hashes: { symbol: string; date: string; sha256: string }[]
  total_samples: number
  total_shards: number
}

export interface TrainingShard {
  symbol: string
  date: string
  dataset: string
  n_samples: number
  n_features: number
  n_labels: number
  output_path: string
  file_size_bytes: number
  shard_hash: string
}

// --- Data endpoints ---

export interface Bar {
  ts: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  n_events: number
  n_trades: number
  avg_spread: number
  avg_imbalance: number
  avg_imbalance_l1: number
  avg_imbalance_l5: number
  avg_depth_bid: number
  avg_depth_ask: number
  avg_book_slope_bid: number
  avg_book_slope_ask: number
  avg_ct_sz_ratio_bid: number
  avg_ct_sz_ratio_ask: number
  avg_r: number
  r_std: number
  avg_delta_r: number
  hidden_trade_volume: number
  avg_boundary_bid: number
  avg_boundary_ask: number
  trade_intensity: number
  delta_mid_std: number
  return_1m: number
  direction_1m: number
}

export interface BarsResponse {
  symbol: string
  from_date: string
  to_date: string
  count: number
  bars: Bar[]
}

export interface TrainingSample {
  ts: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  n_events: number
  n_trades: number
  avg_spread: number
  avg_imbalance: number
  avg_imbalance_l1: number
  avg_imbalance_l5: number
  avg_depth_bid: number
  avg_depth_ask: number
  avg_book_slope_bid: number
  avg_book_slope_ask: number
  avg_ct_sz_ratio_bid: number
  avg_ct_sz_ratio_ask: number
  avg_r: number
  r_std: number
  avg_delta_r: number
  hidden_trade_volume: number
  avg_boundary_bid: number
  avg_boundary_ask: number
  trade_intensity: number
  delta_mid_std: number
  return_1m: number
  direction_1m: number
  date: string
}

export interface FeatureStats {
  mean: number
  std: number
  min: number
  max: number
  median: number
}

export interface TrainingDataResponse {
  symbol: string
  from_date: string
  to_date: string
  count: number
  samples: TrainingSample[]
  stats: {
    features: Record<string, FeatureStats>
    labels: {
      direction_1m: Record<string, number>
      return_1m: { mean: number; std: number; count: number }
    }
  }
}

export interface ZoneInfo {
  dates: string[]
  total_records: number
  total_size_mb: number
}

export interface DailySummary {
  date: string
  bars: number
  total_volume: number
  avg_spread: number
  return_mean: number
  return_std: number
}

export interface SymbolSummary {
  symbol: string
  dataset: string
  zones: Record<string, ZoneInfo>
  daily: DailySummary[]
}

export interface BaselineResponse {
  symbol: string
  dataset: string
  n_samples: number
  n_train: number
  n_test: number
  n_features: number
  features: string[]
  regression: {
    model: string
    mse: number
    naive_mse: number
    mse_ratio: number
    r2: number
  }
  classification: {
    model: string
    accuracy: number
    naive_accuracy: number
    lift_over_naive: number
    class_accuracy: Record<string, number>
    class_distribution: Record<string, number>
  }
}

// --- Book Heatmap ---

export interface HeatmapTrade {
  ts: number
  sample_idx: number
  price_offset: number
  side: string
  size: number
}

export interface HeatmapResponse {
  n_samples: number
  price_range: number
  total_in_range: number
  timestamps: number[]
  offsets: number[]
  mid_prices: number[]
  depth: number[][]
  trades: HeatmapTrade[]
}

// --- Book Replay ---

export interface ReplayLevel {
  px: number
  sz: number
  ct: number
  delta_sz: number
}

export interface ReplayFrame {
  ts: number
  event: { action: string; side: string; depth: number; price: number; size: number }
  bids: ReplayLevel[]
  asks: ReplayLevel[]
  star_graph: {
    r_value: number
    delta_r: number
    hidden_trade_sz: number
    boundary_bid: number
    boundary_ask: number
  }
  mid_price: number
  spread: number
  imbalance: number
}

export interface ReplayResponse {
  total_in_range: number
  offset: number
  limit: number
  returned: number
  has_more: boolean
  frames: ReplayFrame[]
}
