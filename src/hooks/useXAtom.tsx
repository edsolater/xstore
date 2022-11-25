import { unified } from '@edsolater/fnkit'
import { useRef } from 'react'

import { useForceUpdate } from '../utils/useForceUpdate'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect '
import { XAtom } from '../xatom/type'

export type UseXAtomOptions = {
  /** anything in atom can cause rerender */
  urgentRerender?: boolean
}

export function useXAtom<T extends object>(xStoreAtom: XAtom<T>, options?: UseXAtomOptions): T {
  const [, forceUpdate] = useForceUpdate()

  const subscribeKeys = useRef((options?.urgentRerender ? Object.keys(xStoreAtom.get()) : []) as (keyof T)[])

  useIsomorphicLayoutEffect(() => {
    const keys = subscribeKeys.current
    // zustand not respect store API's subscribe
    const unsubscribers = keys.map((key) => xStoreAtom.subscribe(key, () => forceUpdate()))
    return () => unsubscribers.forEach((fn) => fn())
  }, [])

  // @ts-ignore useProxy to collect subscribeKeys
  return new Proxy(xStoreAtom.get(), {
    get(target, p) {
      subscribeKeys.current = unified([...subscribeKeys.current, p as keyof T])
      return Reflect.get(target, p)
    }
  })
}
