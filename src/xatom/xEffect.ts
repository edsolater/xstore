import { AnyFn, MayPromise, shakeNil } from '@edsolater/fnkit'
import { XAtomPieceSubscriber, XAtomTemplate } from './type'

export type XEffectRegistor = {
  // unused XEffect should not activated and should be tree-shaked
  activate(): () => void
  name?: string
}

export type XEffectSubscribeOptions = {
  effectName?: string
}

export function createXEffect<T extends XAtomPieceSubscriber<XAtomTemplate, string>[]>(
  effectFn: (
    value: {
      [I in keyof T]: T[I] extends XAtomPieceSubscriber<infer X, infer Pro> ? X[Pro] : undefined
    },
    utils: {
      prev: {
        [I in keyof T]: (T[I] extends XAtomPieceSubscriber<infer X, infer Pro> ? X[Pro] : undefined) | undefined
      }
    }
  ) => AnyFn | MayPromise<any> | void,
  dependences: [...T],
  options?: XEffectSubscribeOptions
): XEffectRegistor {
  const currentValue = new Map<XAtomPieceSubscriber<XAtomTemplate, string>, any>()
  const prevValue = new Map<XAtomPieceSubscriber<XAtomTemplate, string>, any>()
  const unsubscribeFns = [] as (() => void)[]
  const activate = () => {
    shakeNil(dependences).forEach((dependence) => {
      currentValue.set(dependence, undefined)
      prevValue.set(dependence, undefined)
      const unsubscribe = dependence.subscribe(
        ({ prev, value }) => {
          currentValue.set(dependence, value)
          prevValue.set(dependence, prev)
          //@ts-expect-error no type-check
          effectFn([...currentValue.values()], { prev: [...prevValue.values()] })
        },
        { immediately: true }
      )
      unsubscribeFns.push(unsubscribe)
    })

    const stop = () => {
      unsubscribeFns.forEach((fn) => fn())
      currentValue.clear()
      prevValue.clear()
    }
    
    return stop
  }
  return {
    activate,
    name: options?.effectName
  }
}

export function mergeXEffects(...effectRegistors: XEffectRegistor[]): XEffectRegistor {
  return {
    name: shakeNil(effectRegistors.map((e) => e.name)).join(' '),
    activate: () => {
      const stopFns = effectRegistors.map((e) => e.activate())
      return () => stopFns.forEach((f) => f())
    }
  }
}
