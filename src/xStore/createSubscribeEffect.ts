import { MayFn, shrinkToValue } from '@edsolater/fnkit'
import { XStoreAtom, XStoreAtomEffect, XStorePropertyKeys } from '../type'

type CleanFn = () => any
type SubscribedFn<X extends XStoreAtom> = (utils: { attachedAtom: X }) => (void | Promise<void>) | CleanFn
type SubscribePath<T extends XStoreAtom> = {
  atom: T
  atomProperty: XStorePropertyKeys<T>
}

export function createAtomEffect<X extends XStoreAtom = XStoreAtom>(
  effectFn: SubscribedFn<X>,
  dependences: MayFn<SubscribePath<XStoreAtom>[], [utils: { attachedAtom: X }]>
): XStoreAtomEffect {
  return (utils: any) => {
    effectFn(utils)
    shrinkToValue(dependences, [utils]).forEach(({ atom, atomProperty }) => {
      atom.subscribe(atomProperty, () => {
        effectFn(utils)
      })
    })
  }
}

export function createSubscribePath<T extends XStoreAtom = XStoreAtom>(
  atom: T,
  atomProperty: XStorePropertyKeys<T>
): SubscribePath<T> {
  return { atom, atomProperty }
}
