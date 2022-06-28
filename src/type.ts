import { AnyObj, MayArray, MayFn, OnlyWritable, WritableKeys } from '@edsolater/fnkit'

type MayStateFn<T> = T | ((prev: T) => T)

export type XStoreUnsubscribeFn = () => void

export type XStoreSubscribeOptions = {
  immediately?: boolean
}

export type XStoreSubscribe<T extends XStoreTemplate> = {
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

export type XStoreAtom<T extends XStoreTemplate = AnyObj> = T &
  ProxiedSetters<T> & {
    xstoreName: string
    initStore: T
    subscribe: XStoreSubscribe<T>
  }

export type XStorePropertyKeys<X extends XStoreAtom> = X extends XStoreAtom<infer T> ? keyof T : never

export type XStoreTemplate = { [key: string]: any }

export type XStoreSetOptions = {
  operation?: 'merge' /* default */ | 'cover'
}

export type ProxiedSetters<S extends XStoreTemplate> = {
  /**
   *  will be merged to the store
   */
  set<P extends WritableKeys<S>>(propName: P, value: MayStateFn<S[P]>): void
  set(newState: MayStateFn<Partial<OnlyWritable<S>>>, options?: XStoreSetOptions): void
} & {
  [K in `set${Capitalize<Extract<WritableKeys<S>, string>>}`]: (
    newState: MayStateFn<K extends `set${infer O}` ? S[Uncapitalize<O>] : any> //TODO: `infer O` and `Uncapitalize<O>` means XStore is not friendly with Pascalcase Variable
  ) => void
}

export type XStoreAtomEffect<T extends XStoreTemplate = AnyObj> = (tools: {
  attachedAtom: XStoreAtom<T>
}) => void | Promise<void>

export type CreateXStoreOptions<T extends XStoreTemplate = AnyObj> = {
  /** used by localStorageEffect*/
  name: string
  default?: T
  atomEffects?: MayArray<XStoreAtomEffect<AnyObj>>
}

export type GetUseDataHooks<T extends XStoreTemplate = AnyObj> = () => T & ProxiedSetters<T>
