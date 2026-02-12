import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import httpProxy from 'http-proxy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 8082
const API_TARGET = process.env.API_TARGET || 'http://localhost:8000'

const proxy = httpProxy.createProxyServer({ target: API_TARGET })
proxy.on('error', (err, _req, res) => {
  console.error('[proxy error]', err.message)
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Backend unavailable' }))
  }
})

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  // Proxy /api to backend
  if (req.url.startsWith('/api')) {
    return proxy.web(req, res)
  }

  // Serve static files
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url)
  const ext = path.extname(filePath)

  // If no extension or file doesn't exist → SPA fallback
  if (!ext || !fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html')
  }

  const mime = MIME[path.extname(filePath)] || 'application/octet-stream'
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': mime })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`[umiki-web] http://localhost:${PORT}`)
  console.log(`[umiki-web] /api → ${API_TARGET}`)
})
