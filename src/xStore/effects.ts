import { AnyObj, WritableKeys } from '@edsolater/fnkit'
import { XStoreAtomEffect } from './type'
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage'
import { XAtomTemplate } from '../xAtom/type'

/**
 * is `XStore`'s effect
 */
export function syncWithLocalStorage<T extends XAtomTemplate = AnyObj>(keys: WritableKeys<T>[]) {
  return (({ attachedAtom: self }) => {
    keys.forEach((k) => {
      self.set(k, getLocalStorageItem(`xStore: ${self.xstoreName}`)?.[k])
      self.subscribe(
        k,
        (v) => v != null && setLocalStorageItem(`xStore: ${self.xstoreName}`, (s) => ({ ...s, [k]: v }))
      )
    })
  }) as XStoreAtomEffect<T>
}
