import { flap, MayArray, shakeNil } from '@edsolater/fnkit'
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage'
import { XAtomTemplate, XPlugin } from './type'

export function createXPlugin<T extends XAtomTemplate>(config: XPlugin<T>): XPlugin<T> {
  return config
}
/**
 * is `XAtom`'s effect
 */
export function recordWidthLocalStorage<T extends XAtomTemplate>(options: {
  /** namespace */
  keyPrefix?: string
  /** if not specified, all xatom's property will be record  */
  observeProperty: MayArray<keyof T>
  /** final key will be prefix-atomproperty (this property will only use when keyPrefix is set) */
  namespaceHyphenLetter?: string
}) {
  return createXPlugin<T>({
    name: 'record with local storage',
    pluginFn({ set, subscribe }) {
      flap(options.observeProperty).forEach((propertyName: any) => {
        const storageKey = shakeNil([options.keyPrefix, propertyName]).join(options.namespaceHyphenLetter ?? '_')
        const localValue = getLocalStorageItem(storageKey)?.[propertyName]

        if (localValue != null) set(propertyName, localValue)
        subscribe(propertyName, (v) => v != null && setLocalStorageItem(storageKey, v))
      })
    }
  })
}
