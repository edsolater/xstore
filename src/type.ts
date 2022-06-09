import { MayArray, OnlyWritable, WritableKeys } from '@edsolater/fnkit'

type MayStateFn<T> = T | ((prev: T) => T)

export type XStoreUnsubscribeFn = () => void
export type XStoreSubscribeOptions = {
  immediately?: boolean
}

export type XStoreSubscribe<T extends StoreTemplate> = {
  <P extends keyof T>(p: P, fn: (curr: T[P], prev: T[P]) => void, options?: XStoreSubscribeOptions): XStoreUnsubscribeFn
  <P extends keyof T>(
    p: P[],
    fn: (curr: T[P][], prev: T[P][]) => void,
    options?: XStoreSubscribeOptions
  ): XStoreUnsubscribeFn
}

export type XStore<T extends StoreTemplate = StoreTemplate> = T &
  ProxiedSetters<T> & {
    initStore: T
    subscribe: XStoreSubscribe<T>
  }
export type XStorePlainKey<X extends XStore> = X extends XStore<infer T> ? keyof T : never
export type StoreTemplate = { [key: string]: any }

export type ProxiedSetters<S extends StoreTemplate> = {
  /**
   *  will be merged to the store
   */
  set<P extends WritableKeys<S>>(propName: P, value: MayStateFn<S[P]>): void
  set(newState: MayStateFn<Partial<OnlyWritable<S>>>): void
} & {
  [K in `set${Capitalize<Extract<WritableKeys<S>, string>>}`]: (
    newState: MayStateFn<K extends `set${infer O}` ? S[Uncapitalize<O>] : any> //TODO: `infer O` and `Uncapitalize<O>` means XStore is not friendly with Pascalcase Variable
  ) => void
}

export type XStoreEffectItem<T extends StoreTemplate> = (tools: {
  options: Omit<CreateXStoreOptions<T>, 'effects'>
  onSelfSet: XStoreSubscribe<T>
  /** inner function will be invoked after all sync xStore has created */
  onInit: (fn: () => void) => void
  self: XStore<T>
}) => void

export type CreateXStoreOptions<T extends StoreTemplate> = {
  /** used by localStorageEffect*/
  name: string
  default?: T
  effects?: MayArray<XStoreEffectItem<T>>
}

export type GetUseDataHooks<T extends StoreTemplate> = () => T & ProxiedSetters<T>
