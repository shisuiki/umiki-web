# UMIKI Backend API Specification
> Received from umiki backend agent (request_id: umiki-api-001)
> Backend: http://localhost:8000
> CORS: all origins (*), no auth

---

## Health
```
GET /api/health → {"status": "ok"}
```

## Jobs (pipeline execution)
```
GET  /api/jobs              → [{id, status, stages, created_at, finished_at}]
POST /api/jobs              → {id, status}
  body: {spec, stages[], symbols[], extended, force}
GET  /api/jobs/{id}         → {id, status, stages, spec_path, created_at, started_at, finished_at, error}
```

## Datasets (registered data files)
```
GET /api/datasets                    → [{id, dataset, symbol, date, zone, n_records, file_size}]
GET /api/datasets?zone=canonical     → filter by zone (raw/canonical/derived/training)
GET /api/datasets?symbol=NVDA        → filter by symbol
GET /api/datasets/{id}               → {id, dataset, symbol, date, zone, file_path, n_records, file_size, sha256}
```

## QC (quality control results)
```
GET /api/qc                     → [{id, dataset, symbol, date, n_records, n_seq_gaps, n_bbo_crossed, n_bbo_locked, spread_mean, spread_median, action_dist, alerts}]
GET /api/qc?symbol=NVDA         → filter by symbol
GET /api/qc?date=2026-02-02     → filter by date
GET /api/qc/alerts              → [{level, symbol, date, message}]
GET /api/qc/{date}/{symbol}     → single QC detail
```

## Audit (book snapshot inspection)
```
GET /api/audit/sample?dataset=XNAS.ITCH&symbol=NVDA&date=2026-02-02&n=10&seed=42
    → {dataset, symbol, date, total_records, n_samples, snapshots: [
        {record_index, ts_event, action, side, depth, price, size,
         bids: [{px, sz, ct}], asks: [{px, sz, ct}]}
      ]}

GET /api/audit/validate?dataset=XNAS.ITCH&symbol=NVDA&date=2026-02-02
    → {total_records, sample_size, trade_bbo_unchanged_pct, group_a_proper_order_pct}
```

## Export (training data)
```
POST /api/export         → {status, dataset, symbols}
  body: {dataset, symbols[], force}
GET  /api/export/manifest → training manifest JSON
```

## Current Data Available
- NVDA: 5 days (2026-02-02 to 2026-02-06), 48.7M records
- AAPL/AMZN/MSFT: 1 day each (2026-02-02)
- All zones populated: raw, canonical, derived, training
