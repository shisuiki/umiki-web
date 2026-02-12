import ky from 'ky'
import type {
  Job,
  JobCreateRequest,
  Dataset,
  QCReport,
  QCAlert,
  AuditSampleResponse,
  AuditValidateResponse,
  ExportRequest,
  ExportResponse,
  TrainingManifest,
  BarsResponse,
  TicksResponse,
  BookResponse,
  TrainingDataResponse,
  SymbolSummary,
} from '@/types/api'

const api = ky.create({
  prefixUrl: '/api',
  timeout: 30000,
})

// Health
export const getHealth = () => api.get('health').json<{ status: string }>()

// Jobs
export const getJobs = () => api.get('jobs').json<Job[]>()
export const getJob = (id: string) => api.get(`jobs/${id}`).json<Job>()
export const createJob = (body: JobCreateRequest) =>
  api.post('jobs', { json: body }).json<Job>()

// Datasets
export const getDatasets = (params?: { zone?: string; symbol?: string }) =>
  api.get('datasets', { searchParams: params ?? {} }).json<Dataset[]>()
export const getDataset = (id: string) => api.get(`datasets/${id}`).json<Dataset>()

// QC
export const getQCReports = (params?: { symbol?: string; date?: string }) =>
  api.get('qc', { searchParams: params ?? {} }).json<QCReport[]>()
export const getQCAlerts = () => api.get('qc/alerts').json<QCAlert[]>()
export const getQCDetail = (date: string, symbol: string) =>
  api.get(`qc/${date}/${symbol}`).json<QCReport>()

// Audit
export const getAuditSample = (params: {
  dataset: string
  symbol: string
  date: string
  n?: number
  seed?: number
}) => api.get('audit/sample', { searchParams: params as Record<string, string | number> }).json<AuditSampleResponse>()

export const getAuditValidate = (params: {
  dataset: string
  symbol: string
  date: string
}) => api.get('audit/validate', { searchParams: params as Record<string, string> }).json<AuditValidateResponse>()

// Export
export const triggerExport = (body: ExportRequest) =>
  api.post('export', { json: body }).json<ExportResponse>()
export const getExportManifest = () =>
  api.get('export/manifest').json<TrainingManifest>()

// Data
export const getBars = (params: { symbol: string; from: string; to: string; session?: string }) =>
  api.get('data/bars', { searchParams: params as Record<string, string> }).json<BarsResponse>()

export const getTicks = (params: {
  symbol: string; date: string; from_ts: string; to_ts: string; limit?: number
}) => api.get('data/ticks', { searchParams: params as Record<string, string | number> }).json<TicksResponse>()

export const getBook = (params: { symbol: string; date: string; ts: string }) =>
  api.get('data/book', { searchParams: params }).json<BookResponse>()

export const getTrainingData = (params: { symbol: string; from: string; to: string }) =>
  api.get('data/training', { searchParams: params }).json<TrainingDataResponse>()

export const getSymbolSummary = (symbol: string) =>
  api.get('data/summary', { searchParams: { symbol } }).json<SymbolSummary>()
