import { AnyFn, AnyObj } from '@edsolater/fnkit'
import { XAtomPieceSubscriber, XAtomTemplate } from './type'

export type XEffectRegistor = {
  // unused XEffect should not activated and should be tree-shaked
  activate(): void
  name?: string
}

export function createXEffect<T extends XAtomTemplate = AnyObj>(
  effectFn: () => AnyFn | void,
  dependence: XAtomPieceSubscriber<T, keyof T>[],
  options?: {
    effectName?: string
  }
): XEffectRegistor {
  let haveRegisted = false
  const activate = () => {
    if (haveRegisted) return
    haveRegisted = true
    dependence.forEach((xSubscriber) => {
      xSubscriber.subscribe(effectFn)
    })
  }
  return {
    activate,
    name: options?.effectName
  }
}
