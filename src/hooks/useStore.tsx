import { useRef } from 'react'
import { unified } from '@edsolater/fnkit'

import { XStoreAtom } from '../type'
import { useForceUpdate } from '../utils/useForceUpdate'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect '

export function useXStore<T extends object>(xStore: XStoreAtom<T>, options?:{
  context: unknown
}): Omit<XStoreAtom<T>, 'subscribe'> {
  const [, forceUpdate] = useForceUpdate()

  const subscribeKeys = useRef([] as (keyof T)[])

  useIsomorphicLayoutEffect(() => {
    const keys = subscribeKeys.current
    // zustand not respect store API's subscribe
    const unsubscribe = xStore.subscribe(keys, () => forceUpdate())
    return unsubscribe
  }, [])

  // @ts-ignore useProxy to collect subscribeKeys
  return new Proxy(xStore, {
    get(target, p) {
      subscribeKeys.current = unified([...subscribeKeys.current, p as keyof T])
      return Reflect.get(target, p)
    }
  })
}
