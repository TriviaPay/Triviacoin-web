/**
 * Import this module early (e.g. from main.tsx) so request interceptors are
 * registered before any other code issues API calls.
 */
import './client'

export {
  api,
  fetchWithAuth,
  exampleGetJson,
  exampleBindPassword,
  hasNonEmptySessionInStorage,
} from './client'
