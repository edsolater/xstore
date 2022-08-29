import { flap, MayArray, MayFn, shrinkToValue } from '@edsolater/fnkit'
import { XAtomAtom, XAtomAtomEffect, XAtomPropertyKeys } from './type'

type CleanFn = () => any
type SubscribedFn<X extends XAtomAtom> = (utils: { attachedAtom: X }) => (void | Promise<void>) | CleanFn
type SubscribePath<T extends XAtomAtom> = {
  atom: MayFn<T>
  atomProperty: MayArray<XAtomPropertyKeys<T>>
}

export function createAtomEffect<X extends XAtomAtom = XAtomAtom>(
  effectFn: SubscribedFn<X>,
  dependences: MayFn<SubscribePath<XAtomAtom>[], [utils: { attachedAtom: X }]>
): XAtomAtomEffect {
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

export function createSubscribePath<T extends XAtomAtom = XAtomAtom>(
  atom: MayFn<T>,
  atomProperty: MayArray<XAtomPropertyKeys<T>>
): SubscribePath<T> {
  return { atom: atom, atomProperty }
}
