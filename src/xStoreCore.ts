import {
  isObject,
  isFunction,
  shrinkToValue,
  toCamelCase,
  MayFn,
  flap,
  MayArray,
  AnyFn,
  isString,
  asyncInvoke
} from '@edsolater/fnkit'
import {
  XStore,
  StoreTemplate,
  ProxiedSetters,
  CreateXStoreOptions,
  XStoreSubscribe,
  XStoreSubscribeOptions,
  XStoreUnsubscribeFn,
  XStoreSetOptions
} from './type'

export function isXStore(v: unknown): v is XStore {
  return isObject(v) && isFunction(v.subscribe) && isObject(v.initStore)
}

/**
 * compute setState methods
 * @param setAll set parent's store
 * @returns computed setState methods
 */
const getProxiedSetters = <S extends StoreTemplate>(
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

export function createXStore<T extends StoreTemplate>(options: CreateXStoreOptions<T>): XStore<T> {
  // create subscribable plain Store
  const plainStore = createXStoreWithoutSetters<T>(options.default)
  const setStoreState = (dispatch: MayFn<StoreTemplate, [StoreTemplate]>) => {
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
  }) as XStore<T>

  if (options.effects) {
    setTimeout(() => {
      // effect should be invoked after xStoreAtom's creating
      const onSelfSet = mergedDataCenter.subscribe
      const onInit: (fn: () => void) => void = (fn) => {
        fn()
      }
      flap([options.effects]).forEach((effect) => effect?.({ onSelfSet, onInit, options, self: mergedDataCenter }))
    })
  }

  return mergedDataCenter
}

/** create xStore with subscribe and initStore */
function createXStoreWithoutSetters<T extends StoreTemplate>(
  defaultStore?: T | undefined
): T & {
  subscribe: {
    <P extends keyof T>(
      p: P,
      fn: (curr: T[P], prev: T[P]) => void,
      options?: XStoreSubscribeOptions
    ): XStoreUnsubscribeFn
    <P extends keyof T>(
      p: P[],
      fn: (curr: T[P][], prev: T[P][]) => void,
      options?: XStoreSubscribeOptions
    ): XStoreUnsubscribeFn
  }
  initStore: T
} {
  const temp = { ...defaultStore } as T
  const initStore = { ...temp }
  const regested: {
    [P in keyof T]?: { fn: (...params: any[]) => void; dependences: (keyof T)[] }[]
  } = {}

  const invokedSubscribedFn = (p: MayArray<keyof T>, fn: AnyFn, store: T, oldStore?: T) => {
    const dependences = [p].flat()
    if (dependences.length <= 1) {
      fn(
        ...(dependences.length <= 1
          ? [store[p as keyof T], oldStore?.[p as keyof T]]
          : [dependences.map((k) => store[k as keyof T]), dependences.map((k) => oldStore?.[k as keyof T])])
      )
    }
  }
  const proxiedTempStore = new Proxy(temp, {
    set(target, key, value) {
      if (!isString(key)) return true
      if (target[key] === value) return true // sameValue, no need to continue
      if (key !== 'subscribe' && key !== 'initStore') {
        const callbacks = regested[key]

        // invoke registed callback
        callbacks?.forEach(({ fn, dependences }) => {
          if (dependences.includes(key)) {
            const oldStore = target
            const newStore = { ...target, [key]: value }
            asyncInvoke(
              () => {
                invokedSubscribedFn(dependences, fn, newStore, oldStore)
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
    dependences.forEach((p) => {
      // @ts-expect-error no need care about type here
      regested[p] = (regested[p] ?? []).concat({ fn: fn, dependences: [p].flat() })
    })
    if (options?.immediately) {
      invokedSubscribedFn(p, fn, temp)
    }
    const unsubscribe = () => {
      dependences.forEach((p) => {
        regested[p] = regested[p]?.filter((cb) => cb?.fn !== fn)
      })
    }
    return unsubscribe
  }
  return Object.assign(proxiedTempStore, { subscribe, initStore })
}
