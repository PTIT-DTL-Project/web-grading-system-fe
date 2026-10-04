import { App as AntdApp, ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import viVN from 'antd/locale/vi_VN'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { colors } from '../shared/theme/tokens'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

/**
 * The single root ConfigProvider (project rule): theme tokens + antd locale in one place.
 * AntdApp exposes message/notification/Modal.confirm to the React tree via hooks,
 * so we never call the static `message.*` helpers (they bypass the tree and the theme).
 */
export function Providers({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={i18n.language === 'vi' ? viVN : enUS}
        theme={{
          token: {
            colorPrimary: colors.primary,
            colorLink: colors.primary,
            colorBgLayout: colors.layoutBg,
            colorBgContainer: colors.surface,
            borderRadius: 6,
            fontFamily: "Roboto, -apple-system, 'Segoe UI', sans-serif",
          },
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
