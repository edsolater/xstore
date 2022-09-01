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
      p: P,
      fn: (options: { curr: T[P]; prev: T[P]; unsubscribe: () => void }) => void,
      options?: XAtomSubscribeOptions
    ): XAtomUnsubscribeFn
  } & {
    [P in keyof T]: XAtomPieceSubscriber<T, P>
  }

  // history: readonly T[] // TODO imply it!
}

export type XAtomUnsubscribeFn = () => void

export type XAtomSubscribeOptions = {
  immediately?: boolean
}

export type XAtomPieceSubscriber<T extends XAtomTemplate, P extends keyof T> = {
  subscribe: (
    fn: (options: { curr: T[P]; prev: T[P]; unsubscribe: () => void }) => void,
    options?: XAtomSubscribeOptions
  ) => XAtomUnsubscribeFn
}

export type XPlugin<T extends XAtomTemplate> = {
  name?: string
  pluginFn: (xAtom: XAtom<T>) => void
}
