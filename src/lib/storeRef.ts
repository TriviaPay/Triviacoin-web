import type { Store, UnknownAction } from '@reduxjs/toolkit'

let storeRef: Store<unknown, UnknownAction> | null = null

export function injectStore(store: Store<unknown, UnknownAction>) {
  storeRef = store
}

export function getStore() {
  return storeRef
}
