import { XStoreAtom, XStoreAtomEffect, XStorePropertyKeys, XStoreSubscribeOptions } from '../type'

type CleanFn = () => any
type SubscribedFn = (utils: { attachedAtom: XStoreAtom }) => void | CleanFn
type SubscribePath<T extends XStoreAtom> = {
  atom: T
  atomProperty: XStorePropertyKeys<T>
}

// TODO: auto unsubscribe when atom detected
const allEffects = new Map()

export function createAtomEffect(
  effectFn: SubscribedFn,
  dependences: SubscribePath<XStoreAtom>[],
  options?: XStoreSubscribeOptions
): XStoreAtomEffect {
  return (utils) => {
    dependences.forEach(({ atom, atomProperty }) => {
      atom.subscribe(
        atomProperty,
        () => {
          effectFn(utils)
        },
        options
      )
    })
  }
}

export function getSubscribePath<T extends XStoreAtom = XStoreAtom>(
  atom: T,
  atomProperty: XStorePropertyKeys<T>
): SubscribePath<T> {
  return { atom, atomProperty }
}
