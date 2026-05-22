import type { AuthMode } from '../store/uiSlice'

const STORAGE_KEY = 'trivia_auth_form_draft'

export type AuthFormDraft = {
  form: Record<string, string>
  authMode: AuthMode
  signupStep: string
  forgotStep: string
  sessionToken: string | null
  sessionDescopeUserId: string | null
}

export function loadAuthFormDraft(): AuthFormDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthFormDraft
    if (!parsed || typeof parsed !== 'object') return null
    return {
      form: parsed.form && typeof parsed.form === 'object' ? parsed.form : {},
      authMode: parsed.authMode === 'signup' || parsed.authMode === 'forgot' ? parsed.authMode : 'signin',
      signupStep: typeof parsed.signupStep === 'string' ? parsed.signupStep : 'EMAIL',
      forgotStep: typeof parsed.forgotStep === 'string' ? parsed.forgotStep : 'EMAIL',
      sessionToken: typeof parsed.sessionToken === 'string' ? parsed.sessionToken : null,
      sessionDescopeUserId:
        typeof parsed.sessionDescopeUserId === 'string' ? parsed.sessionDescopeUserId : null,
    }
  } catch {
    return null
  }
}

export function saveAuthFormDraft(draft: AuthFormDraft): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    /* quota / private mode */
  }
}

export function clearAuthFormDraft(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** When user types trailing `@`, suggest @gmail.com (e.g. `name@` → `name@gmail.com`). */
export function applyEmailDomainHint(value: string): string {
  if (value.endsWith('@')) return `${value}gmail.com`
  return value
}
