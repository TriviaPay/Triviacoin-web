/**
 * Hydrates auth session on app load.
 * When token exists in storage but Redux user is null, syncs with backend using descope_user_id.
 */
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { hydrateSession } from '../../store/authSlice'
import { authService } from '../../services/authService'
import { loadAuthFormDraft } from '../../lib/authFormDraft'
import { getOrCreateDeviceUUID } from '../../utils/deviceUUID'

const SIGNUP_INCOMPLETE_STEPS = new Set(['OTP', 'PASSWORD_PROFILE'])

export default function AuthHydration() {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector((s) => s.auth)

  useEffect(() => {
    getOrCreateDeviceUUID()
    const draft = loadAuthFormDraft()
    if (
      draft?.authMode === 'signup' &&
      draft.sessionToken &&
      SIGNUP_INCOMPLETE_STEPS.has(draft.signupStep)
    ) {
      return
    }

    const storedToken = authService.getSessionToken()
    if (storedToken && !user && !isAuthenticated) {
      dispatch(hydrateSession() as any)
    }
  }, [dispatch, user, isAuthenticated])

  return null
}
