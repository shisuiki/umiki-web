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
  n_seq_gaps: number
  n_bbo_crossed: number
  n_bbo_locked: number
  spread_mean: number
  spread_median: number
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
