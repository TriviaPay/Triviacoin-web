/** Accent colors for notification type (left border + icon well). */

export function getNotificationColor(type: string, isDark: boolean): string {
  const t = (type || 'system').toLowerCase()
  if (t.includes('prize') || t.includes('win') || t.includes('draw')) return '#f59e0b'
  if (t.includes('chat') || t.includes('message')) return '#3b82f6'
  if (t.includes('gem') || t.includes('coin') || t.includes('reward')) return '#22c55e'
  if (t.includes('error') || t.includes('alert') || t.includes('fail')) return '#ef4444'
  if (t.includes('remind')) return '#06b6d4'
  return isDark ? '#c4b5fd' : '#7c3aed'
}

export function getNotificationIcon(type: string): string {
  const t = (type || 'system').toLowerCase()
  if (t.includes('prize') || t.includes('win')) return '🏆'
  if (t.includes('chat') || t.includes('message')) return '💬'
  if (t.includes('gem') || t.includes('coin')) return '💎'
  if (t.includes('error') || t.includes('alert')) return '⚠️'
  if (t.includes('draw')) return '🎟️'
  if (t.includes('remind')) return '⏰'
  return '🔔'
}
