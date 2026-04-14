/**
 * Hydrates auth session on app load.
 * When token exists in storage but Redux user is null, syncs with backend using descope_user_id.
 */
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { hydrateSession } from '../../store/authSlice'
import { authService } from '../../services/authService'
import { getOrCreateDeviceUUID } from '../../utils/deviceUUID'

export default function AuthHydration() {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector((s) => s.auth)

  useEffect(() => {
    getOrCreateDeviceUUID()
    const storedToken = authService.getSessionToken()
    if (storedToken && !user && !isAuthenticated) {
      dispatch(hydrateSession() as any)
    }
  }, [dispatch, user, isAuthenticated])

  return null
}
