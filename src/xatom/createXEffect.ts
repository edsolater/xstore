import { AnyFn, AnyObj, MayFn, MayPromise, shakeNil, shrinkToValue } from '@edsolater/fnkit'
import { XAtomPieceSubscriber, XAtomTemplate } from './type'

export type XEffectRegistor = {
  // unused XEffect should not activated and should be tree-shaked
  activate(): void
  name?: string
}

export function createXEffect<T extends XAtomTemplate = AnyObj>(
  effectFn: () => AnyFn | MayPromise<any> | void,
  dependence: MayFn<XAtomPieceSubscriber<T, keyof T> | undefined>[],
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
