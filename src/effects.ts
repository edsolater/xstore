import { WritableKeys } from '@uni/fnkit'
import { getLocalStorageItem, setLocalStorageItem } from '@uni/uikit'
import { XStoreEffectItem } from '.'

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
