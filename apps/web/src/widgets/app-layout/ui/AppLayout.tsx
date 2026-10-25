import { Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { APP_NAME, ROUTES } from '@/shared/config';

const MENU_ITEMS = [
  { key: ROUTES.labs, label: 'Lab' },
  { key: ROUTES.labOrders, label: '의뢰서' },
  { key: ROUTES.bills, label: '거래 명세서' },
  { key: ROUTES.invoices, label: '회계' },
  { key: ROUTES.auditLogs, label: '감사 로그' },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const selected = MENU_ITEMS.find((item) => pathname.startsWith(item.key));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider
        width={220}
        theme="light"
        style={{ borderInlineEnd: '1px solid #f0f0f0' }}
      >
        <Typography.Title level={5} style={{ margin: 0, padding: 16 }}>
          {APP_NAME}
        </Typography.Title>
        <Menu
          mode="inline"
          style={{ borderInlineEnd: 'none' }}
          items={MENU_ITEMS}
          selectedKeys={selected ? [selected.key] : []}
          onClick={({ key }) => void navigate(key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: '#fff', paddingInline: 24 }} />
        <Layout.Content style={{ padding: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
