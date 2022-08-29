import { unified } from '@edsolater/fnkit'
import { useRef } from 'react'

import { XStoreAtom } from '../xStore/type'
import { useForceUpdate } from '../utils/useForceUpdate'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect '

export type UseXStoreOptions = {
  /** anything in atom can cause rerender */
  urgentRerender?: boolean
}

export function useXStore<T extends object>(
  xStoreAtom: XStoreAtom<T>,
  options?: UseXStoreOptions
): XStoreAtom<T>['values'] {
  const [, forceUpdate] = useForceUpdate()

  const subscribeKeys = useRef((options?.urgentRerender ? Object.keys(xStoreAtom.values) : []) as (keyof T)[])

  useIsomorphicLayoutEffect(() => {
    const keys = subscribeKeys.current
    // zustand not respect store API's subscribe
    const unsubscribe = xStoreAtom.subscribe(keys, () => forceUpdate())
    return unsubscribe
  }, [])

  // @ts-ignore useProxy to collect subscribeKeys
  return new Proxy(xStoreAtom.values, {
    get(target, p) {
      subscribeKeys.current = unified([...subscribeKeys.current, p as keyof T])
      return Reflect.get(target, p)
    }
  })
}
