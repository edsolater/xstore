import { flap, MayArray, MayFn, shrinkToValue } from '@edsolater/fnkit'
import { XStoreAtom, XStoreAtomEffect, XStorePropertyKeys } from '../type'

type CleanFn = () => any
type SubscribedFn<X extends XStoreAtom> = (utils: { attachedAtom: X }) => (void | Promise<void>) | CleanFn
type SubscribePath<T extends XStoreAtom> = {
  atom: MayFn<T>
  atomProperty: MayArray<XStorePropertyKeys<T>>
}

export function createAtomEffect<X extends XStoreAtom = XStoreAtom>(
  effectFn: SubscribedFn<X>,
  dependences: MayFn<SubscribePath<XStoreAtom>[], [utils: { attachedAtom: X }]>
): XStoreAtomEffect {
  return (utils: any) => {
    effectFn(utils)
    shrinkToValue(dependences, [utils]).forEach(({ atom, atomProperty }) => {
      const targetAtom = shrinkToValue(atom)
      const targetProperties = flap(atomProperty)
      targetProperties.forEach((property) => {
        targetAtom.subscribe(property, () => {
          effectFn(utils)
        })
      })
    })
  }
}

export function createSubscribePath<T extends XStoreAtom = XStoreAtom>(
  atom: MayFn<T>,
  atomProperty: MayArray<XStorePropertyKeys<T>>
): SubscribePath<T> {
  return { atom: atom, atomProperty }
}
