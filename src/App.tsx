import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import AppLayout from '@/layouts/AppLayout'
import JobsPage from '@/pages/jobs'
import DatasetsPage from '@/pages/datasets'
import QCPage from '@/pages/qc'
import AuditPage from '@/pages/audit'
import ExportPage from '@/pages/export'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1668dc',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/datasets" element={<DatasetsPage />} />
                <Route path="/qc" element={<QCPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="*" element={<Navigate to="/jobs" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
