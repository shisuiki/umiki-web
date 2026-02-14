import { useMemo } from 'react'
import { ProLayout } from '@ant-design/pro-components'
import {
  RocketOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  ExportOutlined,
  LineChartOutlined,
  HeatMapOutlined,
  PlayCircleOutlined,
  DotChartOutlined,
  FundOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract current symbol from URL for dynamic Data submenu
  const currentSymbol = useMemo(() => {
    const match = location.pathname.match(/^\/data\/([^/]+)/)
    return match ? match[1] : 'NVDA'
  }, [location.pathname])

  const menuRoutes = useMemo(() => ({
    routes: [
      {
        path: '/data',
        name: `Data (${currentSymbol})`,
        icon: <LineChartOutlined />,
        routes: [
          { path: `/data/${currentSymbol}`, name: 'Dashboard', icon: <FundOutlined /> },
          { path: `/data/${currentSymbol}/heatmap`, name: 'Book Heatmap', icon: <HeatMapOutlined /> },
          { path: `/data/${currentSymbol}/replay`, name: 'Book Replay', icon: <PlayCircleOutlined /> },
          { path: `/data/${currentSymbol}/training`, name: 'Training Analysis', icon: <DotChartOutlined /> },
        ],
      },
      { path: '/jobs', name: 'Jobs', icon: <RocketOutlined /> },
      { path: '/datasets', name: 'Datasets', icon: <DatabaseOutlined /> },
      { path: '/qc', name: 'QC', icon: <SafetyCertificateOutlined /> },
      { path: '/audit', name: 'Audit', icon: <AuditOutlined /> },
      { path: '/export', name: 'Export', icon: <ExportOutlined /> },
    ],
  }), [currentSymbol])

  return (
    <ProLayout
      title="UMIKI"
      logo={false}
      layout="mix"
      navTheme="realDark"
      siderWidth={210}
      fixSiderbar
      route={menuRoutes}
      location={{ pathname: location.pathname }}
      selectedKeys={[location.pathname]}
      menuItemRender={(item, dom) => (
        <a onClick={() => item.path && navigate(item.path)}>{dom}</a>
      )}
      subMenuItemRender={(_item, dom) => <span>{dom}</span>}
      contentStyle={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}
    >
      <Outlet />
    </ProLayout>
  )
}
