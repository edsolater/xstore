import { AnyFn, AnyObj, MayFn, MayPromise, shakeNil, shrinkToValue } from '@edsolater/fnkit'
import { XAtomPieceSubscriber, XAtomTemplate } from './type'

export type XEffectRegistor = {
  // unused XEffect should not activated and should be tree-shaked
  activate(): void
  name?: string
}

export function createXEffect(
  effectFn: () => AnyFn | MayPromise<any> | void,
  dependence: MayFn<XAtomPieceSubscriber<XAtomTemplate, string> | undefined>[],
  options?: {
    effectName?: string
  }
): XEffectRegistor {
  const activate = () => {
    shakeNil(dependence).forEach((xSubscriber) => {
      shrinkToValue(xSubscriber)?.subscribe(effectFn)
    })
    effectFn()
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
