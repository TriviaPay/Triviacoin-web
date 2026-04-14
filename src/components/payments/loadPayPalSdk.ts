const loaded = new Map<string, Promise<void>>()

function scriptUrl(clientId: string, mode: 'subscription' | 'order'): string {
  const id = encodeURIComponent(clientId)
  if (mode === 'subscription') {
    return `https://www.paypal.com/sdk/js?client-id=${id}&vault=true&intent=subscription&components=buttons`
  }
  return `https://www.paypal.com/sdk/js?client-id=${id}&currency=USD&components=buttons`
}

export function loadPayPalSdk(clientId: string, mode: 'subscription' | 'order'): Promise<void> {
  const key = `${mode}:${clientId}`
  const existing = loaded.get(key)
  if (existing) return existing

  const p = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('document is not available'))
      return
    }
    const prev = document.querySelector(`script[data-pp-key="${key}"]`)
    if (prev && window.paypal) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = scriptUrl(clientId, mode)
    s.async = true
    s.dataset.ppKey = key
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load PayPal SDK'))
    document.body.appendChild(s)
  })
  loaded.set(key, p)
  return p
}
