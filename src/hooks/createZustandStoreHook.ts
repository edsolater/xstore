import { AnyObj, MayFn } from '@edsolater/fnkit'
import { XAtom } from '../xatom/type'

import { useXStore, UseXStoreOptions } from './useXStore'
type ZustandHookDispatcher<T extends AnyObj> = MayFn<Partial<T>, [oldStore: T]>

type ZustandHook<T extends AnyObj> = {
  <U>(selector?: (storeValue: T) => U): U
  setState(dispatcher: ZustandHookDispatcher<T>): void
  getState(): T
}

function createPathCollector<T extends object>(store: T) {
  const path: (string | symbol)[] = []
  const getPath = () => path
  return [
    new Proxy(store, {
      get(target, p, receiver) {
        path.push(p)
        return Reflect.get(target, p, receiver)
      }
    }),
    getPath
  ] as const
}

export function createZustandStoreHook<T extends object>(
  xStoreAtom: XAtom<T>,
  options?: UseXStoreOptions
): ZustandHook<T> {
  const hook = <U>(selector?: (storeValues: T) => U) => {
    const [pathCollector, getPath] = createPathCollector(xStoreAtom.get())
    selector?.(pathCollector)
    const propertyKey = getPath()[0]
    const value = selector ? useXStore(xStoreAtom)[propertyKey] : useXStore(xStoreAtom, options)
    return value
  }
  hook.getState = xStoreAtom.get
  hook.setState = (dispatcher) => xStoreAtom.set(dispatcher)
  return hook
}
