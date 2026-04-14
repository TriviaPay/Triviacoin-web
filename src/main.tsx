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
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider
      projectId={DESCOPE_CONFIG.projectId}
      baseUrl={DESCOPE_CONFIG.baseUrl}
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
