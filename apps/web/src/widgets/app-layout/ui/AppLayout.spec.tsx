import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppLayout } from './AppLayout';

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [{ path: '*', element: <p>본문</p> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('AppLayout', () => {
  it('메뉴와 본문을 보여준다', () => {
    renderAt('/bills');

    for (const label of ['Lab', '의뢰서', '거래 명세서', '회계', '감사 로그']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('본문')).toBeTruthy();
  });

  it('현재 경로의 메뉴를 선택한다', () => {
    renderAt('/bills/abc');

    expect(screen.getByText('거래 명세서').closest('li')?.className).toContain(
      'ant-menu-item-selected',
    );
  });

  it('메뉴를 누르면 해당 경로로 이동한다', () => {
    const router = renderAt('/labs');

    fireEvent.click(screen.getByText('회계'));

    expect(router.state.location.pathname).toBe('/invoices');
  });
});
