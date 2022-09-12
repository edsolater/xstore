import { AnyFn, MayPromise, shakeNil } from '@edsolater/fnkit'
import { XAtomPieceSubscriber, XAtomTemplate } from './type'

export type XEffectRegistor = {
  // unused XEffect should not activated and should be tree-shaked
  activate(): void
  name?: string
}

export type XEffectSubscribeOptions = {
  effectName?: string
}

export function createXEffect(
  effectFn: (utils: {
    value: XAtomPieceSubscriber<XAtomTemplate, string>[] // TODO type
    prev: XAtomPieceSubscriber<XAtomTemplate, string>[] // TODO type
  }) => AnyFn | MayPromise<any> | void,
  dependences: (XAtomPieceSubscriber<XAtomTemplate, string> | undefined)[],
  options?: XEffectSubscribeOptions
): XEffectRegistor {
  const currentValue = new Map<XAtomPieceSubscriber<XAtomTemplate, string>, any>()
  const prevValue = new Map<XAtomPieceSubscriber<XAtomTemplate, string>, any>()
  const activate = () => {
    shakeNil(dependences).forEach((dependence) => {
      currentValue.set(dependence, undefined)
      prevValue.set(dependence, undefined)
      dependence?.subscribe(
        ({ prev, value }) => {
          currentValue.set(dependence, value)
          prevValue.set(dependence, prev)
          effectFn({ value: [...currentValue.values()], prev: [...prevValue.values()] })
        },
        { immediately: true }
      )
    })
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
      effectRegistors.forEach((e) => e.activate())
    }
  }
}
