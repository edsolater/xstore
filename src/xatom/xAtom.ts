import { AnyFn, isFunction, isString, MayFn, shrinkToValue } from '@edsolater/fnkit'
import { XAtom, XAtomPieceSubscriber, XAtomSubscribeFn, XAtomSubscribeOptions, XAtomTemplate, XPlugin } from './type'

export type XAtomCreateOptions<T extends XAtomTemplate> = {
  /** used by localStorageEffect*/
  name: string
  default?: MayFn<T>
  /**
   * effects: additional reactive rules base on xatomProperty value change
   * plugins: official global reactive rules (appply to all x atom Property if not specified). plugin must special to one specific xatom
   */
  plugins?: XPlugin<T>[]
  // /**
  //  * manully remove it from js Heep \
  //  * it will auto do
  //  */
  // destory: () => void
}
export function createXAtom<T extends XAtomTemplate>(options: XAtomCreateOptions<any>): XAtom<T> {
  const { storeState } = createXAtomStoreState({
    onSetValue: (utils) => invokeSubscribeFn(utils),
    initStoreState: shrinkToValue(options.default ?? {})
  })

  const { subscribeFn, invokeSubscribeFn } = createXAtomSubscribeCenter<T>({ storeState })
  const { get } = createXAtomGet({ storeState })
  const { set } = createXAtomSet({ storeState })
  const resultXAtom = { name: options.name, set, get, subscribe: subscribeFn }
  Promise.resolve().then(() => {
    options.plugins?.forEach(({ pluginFn }) => pluginFn(resultXAtom))
  })
  return resultXAtom
}

type XAtomSubscribersCenter<T extends XAtomTemplate> = {
  [P in keyof T | '$any']?: Map<
    (util: { propertyName: keyof T; value: T[P]; prev: T[P]; unsubscribe: () => void }) => unknown,
    {
      unsubscribe: () => void
      subscribeCallback: XAtomSubscribeFn<T, P>
      cleanFn?: () => void
      options?: XAtomSubscribeOptions
    }
  >
}

function createXAtomSubscribeCenter<T extends XAtomTemplate>({ storeState }: { storeState: T }) {
  const subscribersCenter: XAtomSubscribersCenter<T> = {}

  const createUnsubscribeFn = (property: keyof T | '$any', fn: AnyFn) => () => {
    const targetRegisters = subscribersCenter[property]
    if (targetRegisters?.has(fn)) {
      targetRegisters.get(fn)?.cleanFn?.()
      targetRegisters.delete(fn)
    }
  }
  const subscribeFnFunctionCore = (
    property: keyof T | '$any',
    subscribeCallback: XAtomSubscribeFn<T, string>,
    options?: XAtomSubscribeOptions
  ) => {
    const unsubscribe = createUnsubscribeFn(property, subscribeCallback)
    subscribersCenter[property] = (subscribersCenter[property] ?? new Map()).set(subscribeCallback, {
      unsubscribe,
      subscribeCallback,
      options
    })

    // apply option
    if (options?.immediately) {
      if (property === '$any') {
        Object.entries(storeState).forEach(([key, value]) => {
          subscribeCallback({ propertyName: key, value, unsubscribe })
        })
      } else {
        const value = storeState[property] as any
        subscribeCallback({ propertyName: property, value, unsubscribe })
      }
    }

    return unsubscribe
  }

  const subscribeFn = new Proxy(subscribeFnFunctionCore, {
    get: (target, p) =>
      ({
        subscribe: (...args: [any, any]) => target(p as keyof T, ...args),
        initValue: storeState[p as keyof T],
        propertyName: p
      } as XAtomPieceSubscriber<T, keyof T>)
  }) as XAtom<T>['subscribe']

  const invokeSubscribeFn = ({
    propertyName,
    value,
    oldValue
  }: {
    propertyName: string
    value: any
    oldValue: any
  }) => {
    const targetRegisters = subscribersCenter[propertyName]
    if (targetRegisters) {
      for (const register of targetRegisters.values()) {
        register.cleanFn?.()
        const cleanFn = register.subscribeCallback({ propertyName, value, prev: oldValue, unsubscribe: register.unsubscribe })
        if (isFunction(cleanFn)) {
          register.cleanFn = cleanFn
        }
      }
    }
    const all = subscribersCenter['$any']
    if (all) {
      for (const register of all.values()) {
        register.cleanFn?.()
        const cleanFn = register.subscribeCallback({ propertyName, value, prev: oldValue, unsubscribe: register.unsubscribe })
        if (isFunction(cleanFn)) {
          register.cleanFn = cleanFn
        }
      }
    }
  }
  return { invokeSubscribeFn, subscribeFn }
}

function createXAtomStoreState<T extends XAtomTemplate>({
  initStoreState,
  onSetValue
}: {
  initStoreState: T
  onSetValue: (utils: { propertyName: string; value: any; oldValue: any }) => void
}): { storeState: T } {
  const storeState = new Proxy(initStoreState, {
    set(target, key, value, receiver) {
      // same value won't set twice
      if (!isString(key)) return true
      const oldValue = Reflect.get(target, key, receiver)
      if (oldValue === value) {
        return true // sameValue, no need to continue
      } else {
        const setHasSuccess = Reflect.set(target, key, value, receiver)
        onSetValue({ propertyName: key, value, oldValue })
        return setHasSuccess
      }
    }
  })
  return { storeState }
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
