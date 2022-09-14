import { createXAtom, XAtomCreateOptions } from '../xAtom/xAtom'

export function wrapObjToAtom(options: Partial<XAtomCreateOptions<any>>) {
  const atom = createXAtom({ name: 'hooks to xatom', default: {}, ...options })
 
}
