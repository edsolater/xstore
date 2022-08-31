import { WritableKeys } from '@edsolater/fnkit'
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage'

/**
 * is `XAtom`'s effect
 */
export function syncWithLocalStorage<T>(keys: WritableKeys<T>[]) {
  return ({ attachedAtom: self }) => {
    keys.forEach((k) => {
      self.set(k, getLocalStorageItem(`xAtom: ${self.name}`)?.[k])
      self.subscribe(k, (v) => v != null && setLocalStorageItem(`xAtom: ${self.name}`, (s) => ({ ...s, [k]: v })))
    })
  }
}
