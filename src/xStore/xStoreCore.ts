import {
  isObject,
  isFunction,
  shrinkToValue,
  toCamelCase,
  MayFn,
  flap,
  AnyFn,
  isString,
  asyncInvoke
} from '@edsolater/fnkit'
import {
  XStoreAtom,
  XStoreTemplate,
  ProxiedSetters,
  CreateXStoreOptions,
  XStoreSubscribe,
  XStoreSubscribeOptions,
  XStoreUnsubscribeFn,
  XStoreSetOptions
} from '../type'

export function isXStore(v: unknown): v is XStoreAtom {
  return isObject(v) && isFunction(v.subscribe) && isObject(v.initStore)
}

/**
 * compute setState methods
 * @param setAll set parent's store
 * @returns computed setState methods
 */
const getProxiedSetters = <S extends XStoreTemplate>(
  setAll: React.Dispatch<React.SetStateAction<S>>
): ProxiedSetters<S> => {
  const cache = new Map() // to avoid rerender by always returned new setState function
  const baseSetters = {
    set(p: any, v?: any) {
      if (typeof p === 'string') {
        setAll((oldStore) => {
          const oldV = oldStore[p]
          const newV = shrinkToValue(v, [oldV])
          return oldV === newV ? oldStore : { ...oldStore, [p]: newV }
        })
      } else if (typeof p === 'object') {
        const options = v as XStoreSetOptions | undefined
        const isCoverMode = options?.operation === 'cover'
        setAll((oldStore) => {
          const newStore = shrinkToValue(p, [oldStore])
          return oldStore === newStore
            ? oldStore
            : isCoverMode
            ? newStore // cover
            : { ...oldStore, ...newStore } // merge
        })
      }
    }
  }
  // @ts-expect-error force
  return new Proxy(baseSetters, {
    get(target, p: string) {
      if (typeof p !== 'string') return // react devtool may pass this a symbol
      if (p in target) return (target as any)[p]
      if (p.startsWith('set')) {
        if (cache.has(p)) return cache.get(p)
        else {
          const setState = (dispatchNewState: any) => {
            const realPropertyName = toCamelCase(p.replace(/^set/, '')) // so store value can't be Pascalcase
            baseSetters.set(realPropertyName, dispatchNewState)
          }
          cache.set(p, setState)
          return setState
        }
      }
    }
  })
}

export function createXStore<T extends XStoreTemplate>(options: CreateXStoreOptions<T>): XStoreAtom<T> {
  // create subscribable plain Store
  const plainStore = createXStoreWithoutSetters<T>(options.name, options.default)
  const setStoreState = (dispatch: MayFn<XStoreTemplate, [XStoreTemplate]>) => {
    const newStoreValue = shrinkToValue(dispatch, [plainStore])
    Object.entries(newStoreValue).forEach(([k, v]) => {
      // @ts-expect-error no need care about type here
      plainStore[k] = v
    })
  }
  // @ts-ignore
  const proxiedSetters = getProxiedSetters(setStoreState)
  const mergedDataCenter = new Proxy(proxiedSetters, {
    get: (target, property) => {
      if (property === 'subscribe') {
        return plainStore.subscribe
      }
      if (property === 'initStore') {
        return plainStore.initStore
      }
      // @ts-expect-error no need care about type here
      return target[property] ?? plainStore[property]
    }
  }) as XStoreAtom<T>

  Promise.resolve().then(() => {
    // to next frame
    invokeXStoreEffects<T>({ options, attachedAtom: mergedDataCenter })
  })

  return mergedDataCenter
}

function invokeXStoreEffects<T extends XStoreTemplate>({
  options,
  attachedAtom
}: {
  options: CreateXStoreOptions<T>
  attachedAtom: XStoreAtom<T>
}) {
  if (options.atomEffects) {
    setTimeout(() => {
      flap([options.atomEffects]).forEach((atomEffect) => atomEffect?.({ attachedAtom }))
    })
  }
}

/** create xStore with subscribe and initStore */
function createXStoreWithoutSetters<T extends XStoreTemplate>(
  xstoreName: string,
  defaultStore?: T | undefined
): T & {
  xstoreName: string
  subscribe: {
    <P extends keyof T>(
      p: P,
      fn: (options: { curr: T[P]; prev: T[P]; unsubscribe: () => void }) => void,
      options?: XStoreSubscribeOptions
    ): XStoreUnsubscribeFn
    <P extends keyof T>(
      p: P[],
      fn: (options: { curr: T[P][]; prev: T[P][]; unsubscribe: () => void }) => void,
      options?: XStoreSubscribeOptions
    ): XStoreUnsubscribeFn
  }
  initStore: T
} {
  const temp = { ...defaultStore, xstoreName } as T & { xstoreName: string }
  const initStore = { ...temp }

  type SubscribedCallbackItem = {
    fn: (...params: any[]) => void
    dependences: (keyof T)[]
    unsubscribe: () => void
  }

  type SubscribedCallbacks = {
    [P in keyof T]?: SubscribedCallbackItem[]
  }

  const subscribedCallbacks: SubscribedCallbacks = {}

  const invokedSubscribedFn = (callback: SubscribedCallbackItem, store: T, oldStore?: T) => {
    const dependences = callback.dependences
    const currentStoreValue =
      dependences.length <= 1 ? store[dependences[0]] : dependences.map((k) => store[k as keyof T])
    const prevStoreValue =
      dependences.length <= 1 ? oldStore?.[dependences[0]] : dependences.map((k) => oldStore?.[k as keyof T])
    callback.fn({ curr: currentStoreValue, prev: prevStoreValue, unsubscribe: callback.unsubscribe })
  }

  const proxiedTempStore = new Proxy(temp, {
    set(target, key, value) {
      if (!isString(key)) return true
      if (target[key] === value) return true // sameValue, no need to continue
      if (key !== 'subscribe' && key !== 'initStore' && key !== 'xstoreName') {
        const callbacks = subscribedCallbacks[key]

        // invoke registed callback
        callbacks?.forEach((callback) => {
          const { fn, dependences } = callback
          if (dependences.includes(key)) {
            const oldStore = target
            const newStore = { ...target, [key]: value }
            asyncInvoke(
              () => {
                invokedSubscribedFn(callback, newStore, oldStore)
              },
              { key: fn }
            )
          }
        })
      }
      target[key as keyof T] = value
      return true
    }
  })
  const subscribe: XStoreSubscribe<T> = (p: (keyof T)[], fn: AnyFn, options?: XStoreSubscribeOptions) => {
    const dependences = [p].flat()
    const unsubscribe = () => {
      dependences.forEach((p) => {
        subscribedCallbacks[p] = subscribedCallbacks[p]?.filter((cb) => cb?.fn !== fn)
      })
    }
    const callbackItem = { fn, dependences, unsubscribe }
    dependences.forEach((p) => {
      subscribedCallbacks[p] = [...(subscribedCallbacks[p] ?? []), callbackItem]
    })
    if (options?.immediately) {
      invokedSubscribedFn(callbackItem, temp)
    }
    return unsubscribe
  }
  return Object.assign(proxiedTempStore, { subscribe, initStore })
}
