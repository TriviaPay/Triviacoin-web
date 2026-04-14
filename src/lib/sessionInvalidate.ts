type Listener = () => void

const listeners: Listener[] = []

export function subscribeSessionInvalidated(fn: Listener): () => void {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i !== -1) listeners.splice(i, 1)
  }
}

export function emitSessionInvalidated(): void {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* noop */
    }
  })
}
