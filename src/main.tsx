import './api/axiosInstance'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@descope/react-sdk'
import App from './App.tsx'
import CheckoutSuccessPage from './app/CheckoutSuccessPage'
import CheckoutCancelPage from './app/CheckoutCancelPage'
import AuthHydration from './components/auth/AuthHydration'
import { OnboardingProvider } from './components/Onboarding/OnboardingProvider'
import { store } from './store/store'
import { queryClient } from './lib/queryClient'
import { DESCOPE_CONFIG } from './config/descope'
import { ENV_CONFIG } from './config/env'
import './styles/index.css'

if (import.meta.env.DEV) {
  console.info('[env] VITE_DESCOPE_PROJECT_ID →', ENV_CONFIG.DESCOPE_PROJECT_ID || '(empty)')
  console.info('[env] VITE_API_BASE_URL →', ENV_CONFIG.API_BASE_URL)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider
      projectId={DESCOPE_CONFIG.projectId}
      baseUrl={DESCOPE_CONFIG.baseUrl}
      persistTokens={DESCOPE_CONFIG.persistTokens}
      autoRefresh={DESCOPE_CONFIG.autoRefresh}
    >
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <AuthHydration />
          <OnboardingProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/success" element={<CheckoutSuccessPage />} />
                <Route path="/cancel" element={<CheckoutCancelPage />} />
                <Route path="/*" element={<App />} />
              </Routes>
            </BrowserRouter>
          </OnboardingProvider>
        </Provider>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
)
