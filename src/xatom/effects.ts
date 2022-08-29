import { WritableKeys } from '@edsolater/fnkit'
import { XAtomAtomEffect } from './type'
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage'

/**
 * is `XAtom`'s effect
 */
export function syncWithLocalStorage<T>(keys: WritableKeys<T>[]) {
  return (({ attachedAtom: self }) => {
    keys.forEach((k) => {
      self.set(k, getLocalStorageItem(`xAtom: ${self.xstoreName}`)?.[k])
      self.subscribe(
        k,
        (v) => v != null && setLocalStorageItem(`xAtom: ${self.xstoreName}`, (s) => ({ ...s, [k]: v }))
      )
    })
  }) as XAtomAtomEffect<T>
}
