import {
  AnyFn,
  asyncInvoke,
  flap,
  flapDeep,
  isFunction,
  isObject,
  isString,
  MayFn,
  shrinkToValue
} from '@edsolater/fnkit'
import {
  CreateXStoreOptions,
  XStoreAtomSetter,
  XStoreAtom,
  XStoreSetOptions,
  XStoreSubscribe,
  XStoreSubscribeOptions,
  XStoreTemplate,
  XStoreUnsubscribeFn
} from './type'

export function isXStore(v: unknown): v is XStoreAtom {
  return isObject(v) && isFunction(v.subscribe) && isObject(v.initStore)
}

/**
 * compute setState methods
 * @param setAll set parent's store
 * @returns computed setState methods
 */
const createXStoreSet = <S extends XStoreTemplate>(
  setAll: React.Dispatch<React.SetStateAction<S>>
): XStoreAtomSetter<S> => {
  function set(p: any, v?: any) {
    if (typeof p === 'string') {
      setAll((oldStore) => {
        const oldV = oldStore[p]
        const newV = shrinkToValue(v, [oldV])
        return oldV === newV ? oldStore : { ...oldStore, [p]: newV }
      })
    } else if (typeof p === 'object' || typeof p === 'function') {
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
  return set
}

export function createXStore<T extends XStoreTemplate>(options: CreateXStoreOptions<T>): XStoreAtom<T> {
  // create subscribable plain Store
  const tempAtom = createXStoreWithoutSetters<T>(options.name, options.default)
  const get = (property?: keyof T) => (property ? tempAtom.values[property] : tempAtom.values)
  const setStoreState = (dispatch: MayFn<XStoreTemplate, [XStoreTemplate]>) => {
    const newStoreValue = shrinkToValue(dispatch, [tempAtom.values])
    Object.entries(newStoreValue).forEach(([k, v]) => {
      // @ts-expect-error no need care about type here
      tempAtom.values[k] = v
    })
  }
  const set = createXStoreSet(setStoreState)
  const atom = { ...tempAtom, set, get } as unknown as XStoreAtom<T>

  Promise.resolve().then(() => {
    // to next frame
    invokeXStoreEffects<T>({ options, attachedAtom: atom })
  })

  return atom
}

function invokeXStoreEffects<T extends XStoreTemplate>({
  options,
  attachedAtom
}: {
  options: CreateXStoreOptions<T>
  attachedAtom: XStoreAtom<T>
}) {
  if (options.atomEffects) {
    Promise.resolve().then(() => {
      flapDeep(options.atomEffects).forEach((atomEffect) => atomEffect?.({ attachedAtom: attachedAtom as any }))
    })
  }
}

/** create xStore with subscribe and initStore */
function createXStoreWithoutSetters<T extends XStoreTemplate>(
  xstoreName: string,
  defaulStoreValues: T | undefined
): {
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
  values: T
} {
  const xStore = {
    initStore: (defaulStoreValues || {}) as T,
    xstoreName
  }
  const tempStoreValues = { ...defaulStoreValues } as T
  type SubscribedCallbackItem = {
    fn: (...params: any[]) => void
    dependences: (keyof T)[]
    unsubscribe: () => void
  }

  type SubscribedCallbacks = {
    [P in keyof T]?: SubscribedCallbackItem[]
  }

  const subscribedCallbacks: SubscribedCallbacks = {}

  const invokedSubscribedFn = (callback: SubscribedCallbackItem, storeValues: T, oldStoreValues?: T) => {
    const dependences = callback.dependences
    const currentStoreValue =
      dependences.length <= 1 ? storeValues[dependences[0]] : dependences.map((k) => storeValues[k as keyof T])
    const prevStoreValue =
      dependences.length <= 1
        ? oldStoreValues?.[dependences[0]]
        : dependences.map((k) => oldStoreValues?.[k as keyof T])
    callback.fn({ curr: currentStoreValue, prev: prevStoreValue, unsubscribe: callback.unsubscribe })
  }

  const proxiedTempStoreValues = new Proxy(tempStoreValues, {
    set(target, key, value) {
      if (!isString(key)) return true
      if (target[key] === value) return true // sameValue, no need to continue
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
      // @ts-expect-error no need to check this 
      subscribedCallbacks[p] = [...(subscribedCallbacks[p] ?? []), callbackItem]
    })
    if (options?.immediately) {
      invokedSubscribedFn(callbackItem, tempStoreValues)
    }
    return unsubscribe
  }
  return Object.assign(xStore, { subscribe, values: proxiedTempStoreValues })
}
