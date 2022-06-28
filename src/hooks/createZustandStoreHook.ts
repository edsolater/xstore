import { useRef } from 'react'
import { AnyObj, MayFn, unified } from '@edsolater/fnkit'

import { XStoreAtom } from '../type'
import { useForceUpdate } from '../utils/useForceUpdate'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect '
import { useXStore } from './useXStore'
type ZustandHookDispatcher<T extends AnyObj> = MayFn<Partial<T>, [oldStore: T]>

type ZustandHook<T extends AnyObj> = {
  <U>(selector?: (store: T) => U): U
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

export function createZustandStoreHook<T extends object>(xStoreAtom: XStoreAtom<T>): ZustandHook<T> {
  const hook = <U>(selector?: (store: T) => U) => {
    const [pathCollector, getPath] = createPathCollector(xStoreAtom)
    selector?.(pathCollector)
    const propertyKey = getPath()[0]
    const value = selector ? useXStore(xStoreAtom)[propertyKey] : useXStore(xStoreAtom, { urgentRerender: true })
    return value
  }
  hook.getState = () => xStoreAtom
  hook.setState = (dispatcher) => xStoreAtom.set(dispatcher)
  return hook
}
