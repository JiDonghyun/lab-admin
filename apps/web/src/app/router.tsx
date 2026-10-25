import { createBrowserRouter, Navigate } from 'react-router';
import { ComingSoonPage } from '@/pages/coming-soon';
import { NotFoundPage } from '@/pages/not-found';
import { ROUTES } from '@/shared/config';
import { AppLayout } from '@/widgets/app-layout';

// 메뉴별 화면은 마일스톤마다 ComingSoonPage 를 실제 페이지로 바꾼다.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={ROUTES.labs} replace /> },
      { path: ROUTES.labs, element: <ComingSoonPage /> },
      { path: ROUTES.labOrders, element: <ComingSoonPage /> },
      { path: ROUTES.bills, element: <ComingSoonPage /> },
      { path: ROUTES.invoices, element: <ComingSoonPage /> },
      { path: ROUTES.auditLogs, element: <ComingSoonPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
