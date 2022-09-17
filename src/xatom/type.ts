import { AnyObj, OnlyWritable, SKeyof, WritableKeys } from '@edsolater/fnkit'

type MayStateFn<T, F = T> = T | ((prev: F) => T)

export type GetXAtomPropertyKeys<X extends XAtom> = X extends XAtom<infer T> ? keyof T : never

export type XAtomTemplate = AnyObj

export type XAtom<T extends XAtomTemplate = any> = {
  name: string

  // set a/multi property of xtom
  set: {
    /**
     *  will be merged to the store
     */
    <P extends WritableKeys<T>>(propName: P, value: MayStateFn<T[P]>): void
    (newState: MayStateFn<Partial<OnlyWritable<T>>, T>): void
  }

  // get current state of xatom
  get: {
    /**
     *  will be merged to the store
     */
    <P extends SKeyof<T>>(propName: P): T[P]
    (): T
  }

  // subscrive value change
  subscribe: {
    <P extends keyof T>(
      propertyName: P | '$any',
      fn: (options: { propertyName: P; value: T[P]; prev: T[P]; unsubscribe: () => void }) => void,
      options?: XAtomSubscribeOptions
    ): XAtomUnsubscribeFn
  } & {
    [P in keyof T]-?: XAtomPieceSubscriber<T, P>
  }

  // history: readonly T[] // TODO imply it!
}

export type XAtomUnsubscribeFn = () => void


export type XAtomSubscribeFn<T extends XAtomTemplate, P extends keyof T | '$any'> = (util: {
  propertyName: keyof T
  value: T[P]
  prev?: T[P]
  unsubscribe: () => void
}) => unknown

export type XAtomSubscribeOptions = {
  immediately?: boolean
}

export type XAtomPieceSubscriber<T extends XAtomTemplate, P extends keyof T> = {
  propertyName: keyof any
  initValue: unknown
  subscribe: (
    fn: (options: { propertyName: P; value: T[P]; prev: T[P]; unsubscribe: () => void }) => void,
    options?: XAtomSubscribeOptions
  ) => XAtomUnsubscribeFn
}

export type XPlugin<T extends XAtomTemplate> = {
  name?: string
  pluginFn: (xAtom: XAtom<T>) => void
}
