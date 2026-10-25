import { App as AntdApp, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { RouterProvider } from 'react-router';
import { router } from './router';

export function App() {
  return (
    <ConfigProvider locale={koKR}>
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
}
