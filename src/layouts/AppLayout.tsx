import { ProLayout } from '@ant-design/pro-components'
import {
  RocketOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  ExportOutlined,
  LineChartOutlined,
  BarChartOutlined,
  DotChartOutlined,
  FundOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const menuRoutes = {
  routes: [
    {
      path: '/data',
      name: 'Data',
      icon: <LineChartOutlined />,
      routes: [
        { path: '/data/NVDA', name: 'NVDA Dashboard', icon: <FundOutlined /> },
        { path: '/data/NVDA/ticks', name: 'Tick Explorer', icon: <BarChartOutlined /> },
        { path: '/data/NVDA/training', name: 'Training Analysis', icon: <DotChartOutlined /> },
      ],
    },
    { path: '/jobs', name: 'Jobs', icon: <RocketOutlined /> },
    { path: '/datasets', name: 'Datasets', icon: <DatabaseOutlined /> },
    { path: '/qc', name: 'QC', icon: <SafetyCertificateOutlined /> },
    { path: '/audit', name: 'Audit', icon: <AuditOutlined /> },
    { path: '/export', name: 'Export', icon: <ExportOutlined /> },
  ],
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()

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
