import { AnyFn, asyncInvoke, isString, shrinkToValue } from '@edsolater/fnkit'
import { XAtom, XAtomSubscribeOptions, XAtomTemplate, XAtomUnsubscribeFn } from './type'

type XAtomCreateOptions<T extends XAtomTemplate> = {
  /** used by localStorageEffect*/
  name: string
  default: T
  // atomEffects?: MayDeepArray<XAtomEffect<AnyObj>>
}
export function createXAtom<T extends XAtomTemplate>(options: XAtomCreateOptions<T>): XAtom<T> {
  const { subscribeFn, subscribers } = createXAtomSubscribeCenter<T>()
  const { storeState } = createXAtomStoreState({ subscribers, initStoreState: options.default })
  const { get } = createXAtomGet({ storeState })
  const { set } = createXAtomSet({ storeState })
  return { name: options.name, set, get, subscribe: subscribeFn }
}

type XAtomSubscribers<T extends XAtomTemplate> = {
  [P in keyof T]?: {
    unsubscribe: () => void
    fn: (util: { curr: T[P]; prev: T[P]; unsubscribe: () => void }) => void
  }[]
}

/** return  */
function createXAtomStoreState<T extends XAtomTemplate>({
  initStoreState,
  subscribers
}: {
  initStoreState: T
  subscribers: XAtomSubscribers<T> // transform
}): { storeState: T } {
  const storeState = new Proxy(initStoreState, {
    set(target, key, value, receiver) {
      // same value won't set twice
      if (!isString(key)) return true
      const oldValue = Reflect.get(target, key, receiver)
      if (oldValue === value) {
        return true // sameValue, no need to continue
      } else {
        subscribers[key]?.forEach(({ unsubscribe, fn: subFn }) => {
          subFn({ curr: value, prev: oldValue, unsubscribe })
        })
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
  return { storeState }
}

function createXAtomSubscribeCenter<T extends XAtomTemplate>(): {
  subscribers: XAtomSubscribers<T> // for invoke subscribers
  subscribeFn: XAtom<T>['subscribe']
} {
  const subscribersCenter: XAtomSubscribers<T> = {}

  const subscribeFnPart = (property: keyof T, fn, options) => {
    const unsubscribe = () => {
      subscribersCenter[property] = subscribersCenter[property]?.filter(
        (storedSubscriber) => storedSubscriber.fn !== fn
      )
    }
    subscribersCenter[property] = [...(subscribersCenter[property] ?? []), { unsubscribe, fn }]
    return unsubscribe
  }
  const subscribeFn = new Proxy(subscribeFnPart, {
    get(target, p) {
      return (...args: [any, any]) => target(p as keyof T, ...args)
    }
  }) as XAtom<T>['subscribe']
  return { subscribers: subscribersCenter, subscribeFn }
}

/**
 * compute setState methods
 * @param setAll set parent's store
 * @returns computed setState methods
 */
function createXAtomSet<T extends XAtomTemplate>({ storeState }: { storeState: T }): { set: XAtom<T>['set'] } {
  function set(p: any, v?: any) {
    if (typeof p === 'string') {
      storeState[p as keyof T] = v
    } else if (typeof p === 'object' || typeof p === 'function') {
      Object.assign(storeState, shrinkToValue(p, [storeState]))
    }
  }
  return { set }
}

function createXAtomGet<T extends XAtomTemplate>({ storeState }: { storeState: T }): { get: XAtom<T>['get'] } {
  const get = ((property?: keyof T) => (property ? storeState[property] : storeState)) as XAtom<T>['get']
  return { get }
}
