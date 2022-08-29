import { AnyObj, MayArray, MayDeepArray, MayFn, OnlyWritable, SKeyof, WritableKeys } from '@edsolater/fnkit'

type MayStateFn<T, F = T> = T | ((prev: F) => T)

export type XAtomUnsubscribeFn = () => void

export type XAtomSubscribeOptions = {
  immediately?: boolean
}

export type XAtomSubscribe<T extends XAtomTemplate> = {
  <P extends keyof T>(
    p: P,
    fn: (options: { curr: T[P]; prev: T[P]; unsubscribe: () => void }) => void,
    options?: XAtomSubscribeOptions
  ): XAtomUnsubscribeFn
  <P extends keyof T>(
    p: P[],
    fn: (options: { curr: T[P][]; prev: T[P][]; unsubscribe: () => void }) => void,
    options?: XAtomSubscribeOptions
  ): XAtomUnsubscribeFn
}

export type XAtomAtom<T extends XAtomTemplate = any> = {
  xstoreName: string
  initStore: T
  subscribe: XAtomSubscribe<T>
  values: T
  set: XAtomAtomSetter<T>
  get: XAtomAtomGetter<T>
}

export type XAtomPropertyKeys<X extends XAtomAtom> = X extends XAtomAtom<infer T> ? keyof T : never

export type XAtomTemplate = AnyObj

export type XAtomSetOptions = {
  operation?: 'merge' /* default */ | 'cover'
}

export type XAtomAtomGetter<S extends XAtomTemplate> = {
  /**
   *  will be merged to the store
   */
  <P extends SKeyof<S>>(propName: P): S[P]
  (): S
}
export type XAtomAtomSetter<S extends XAtomTemplate> = {
  /**
   *  will be merged to the store
   */
  <P extends WritableKeys<S>>(propName: P, value: MayStateFn<S[P]>): void
  (newState: MayStateFn<Partial<OnlyWritable<S>>, S>, options?: XAtomSetOptions): void
}

type GetValueSetters<S extends XAtomTemplate> = {
  [K in `set${Capitalize<Extract<WritableKeys<S>, string>>}`]: (
    newState: MayStateFn<K extends `set${infer O}` ? S[Uncapitalize<O>] : any> //TODO: `infer O` and `Uncapitalize<O>` means XAtom is not friendly with Pascalcase Variable
  ) => void
}

export type XAtomAtomEffect<T extends XAtomTemplate = AnyObj> = (tools: {
  attachedAtom: XAtomAtom<T>
}) => void | Promise<void>

export type CreateXAtomOptions<T extends XAtomTemplate = AnyObj> = {
  /** used by localStorageEffect*/
  name: string
  default?: T
  atomEffects?: MayDeepArray<XAtomAtomEffect<AnyObj>>
}
