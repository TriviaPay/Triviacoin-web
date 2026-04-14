/**
 * In-app notification store for web (list + read/delete) with optional API sync.
 */
import { apiService } from './apiService'

export type AppNotification = {
  id: string
  title: string
  message: string
  timestamp: number
  read: boolean
  type: string
}

let items: AppNotification[] = []
const listeners = new Set<(list: AppNotification[]) => void>()

function notify(): void {
  const snap = [...items]
  listeners.forEach((cb) => {
    try {
      cb(snap)
    } catch {
      /* ignore */
    }
  })
}

function mapRow(n: Record<string, unknown>): AppNotification {
  const created =
    (n.created_at as string | undefined) ||
    (n.createdAt as string | undefined) ||
    (n.date as string | undefined)
  const ts = created ? new Date(created).getTime() : Date.now()
  return {
    id: String(n.id ?? `n-${ts}-${Math.random().toString(36).slice(2, 9)}`),
    title: String(n.title ?? 'Notification'),
    message: String(n.body ?? n.message ?? ''),
    timestamp: Number.isFinite(ts) ? ts : Date.now(),
    read: Boolean(n.read ?? n.is_read ?? false),
    type: String(n.type ?? 'system'),
  }
}

export function subscribe(callback: (list: AppNotification[]) => void): () => void {
  listeners.add(callback)
  callback([...items])
  return () => {
    listeners.delete(callback)
  }
}

export function getNotifications(): AppNotification[] {
  return [...items]
}

export function unreadCount(): number {
  return items.filter((n) => !n.read).length
}

/** Replace list from API (or merge on failure keep local). */
export async function syncFromApi(token: string | null): Promise<void> {
  if (!token) {
    items = []
    notify()
    return
  }
  const res = await apiService.getNotifications(token, { limit: 50, offset: 0 })
  if (!res.success || !res.data) {
    notify()
    return
  }
  items = res.data.notifications.map((row) => mapRow(row))
  notify()
}

export async function markAsRead(token: string | null, id: string): Promise<void> {
  const i = items.findIndex((n) => n.id === id)
  if (i === -1) return
  if (!items[i].read) {
    items[i] = { ...items[i], read: true }
    notify()
  }
  if (token) {
    const num = Number.parseInt(id, 10)
    if (!Number.isNaN(num)) {
      void apiService.markNotificationIdsRead(token, [num])
    }
  }
}

export async function markAllAsRead(token: string | null): Promise<void> {
  items = items.map((n) => (n.read ? n : { ...n, read: true }))
  notify()
  if (token) void apiService.markAllNotificationsRead(token)
}

export async function removeNotification(token: string | null, id: string): Promise<void> {
  items = items.filter((n) => n.id !== id)
  notify()
  if (token) {
    const num = Number.parseInt(id, 10)
    if (!Number.isNaN(num)) void apiService.deleteNotificationById(token, num)
  }
}

export async function clearAll(token: string | null): Promise<void> {
  items = []
  notify()
  if (token) void apiService.deleteAllNotifications(token)
}

/** Optional: push a local-only notification (e.g. from future web push). */
export function pushLocal(n: Omit<AppNotification, 'read'> & { read?: boolean }): void {
  const row: AppNotification = {
    id: n.id,
    title: n.title,
    message: n.message,
    timestamp: n.timestamp,
    read: n.read ?? false,
    type: n.type,
  }
  const exists = items.some((x) => x.id === row.id)
  if (exists) return
  items = [row, ...items].slice(0, 100)
  notify()
}
