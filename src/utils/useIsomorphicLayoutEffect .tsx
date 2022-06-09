import { useEffect, useLayoutEffect } from 'react'
import { inClient } from './isSSR'

export const useIsomorphicLayoutEffect = inClient ? useLayoutEffect : useEffect
