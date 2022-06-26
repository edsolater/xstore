import { XStoreAtom, XStoreAtomEffect, XStorePropertyKeys } from '../type'

type CleanFn = () => any
type SubscribedFn = (utils: { attachedAtom: XStoreAtom /* TODO: dependences value */}) => (void | Promise<void>) | CleanFn
type SubscribePath<T extends XStoreAtom> = {
  atom: T
  atomProperty: XStorePropertyKeys<T>
}

export function createAtomEffect(effectFn: SubscribedFn, dependences: SubscribePath<XStoreAtom>[]): XStoreAtomEffect {
  return (utils) => {
    effectFn(utils)
    dependences.forEach(({ atom, atomProperty }) => {
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
