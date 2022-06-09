import { WritableKeys } from '@edsolater/fnkit'
import { XStoreEffectItem } from './type'
import { getLocalStorageItem, setLocalStorageItem } from './utils/localStorage'

/**
 * is `XStore`'s effect
 */
export function syncWithLocalStorage<T>(keys: WritableKeys<T>[]) {
  return (({ onSelfSet, onInit, options, self }) => {
    keys.forEach((k) => {
      onInit(() => self.set(k, getLocalStorageItem(`xStore: ${options.name}`)?.[k]))
      onSelfSet(k, (v) => v != null && setLocalStorageItem(`xStore: ${options.name}`, (s) => ({ ...s, [k]: v })))
    })
  }) as XStoreEffectItem<T>
}
