import { flap, MayArray } from '@edsolater/fnkit'
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage'
import { XAtomTemplate, XPlugin } from './type'

export function createXPlugin<T>(config: XPlugin<T>): XPlugin<T> {
  return config
}
/**
 * is `XAtom`'s effect
 */
export function recordWidthLocalStorage<T extends XAtomTemplate>(options: {
  /** namespace */
  keyPrefix: string
  /** if not specified, all xatom's property will be record  */
  observeProperty: MayArray<keyof T>
  /** final key will be prefix-atomproperty */
  namespaceHyphenLetter?: string
}) {
  return createXPlugin<T>({
    name: 'syncWithLocalStorage',
    pluginFn({ set, subscribe }) {
      flap(options.observeProperty).forEach((propertyName: any) => {
        const storageKey = [options.keyPrefix, propertyName].join(options.namespaceHyphenLetter ?? '_')
        const localValue = getLocalStorageItem(storageKey)?.[propertyName]
        if (localValue != null) set(propertyName, localValue)
        subscribe(propertyName, (v) => v != null && setLocalStorageItem(storageKey, v))
      })
    }
  })
}
