import { useCallback, useState } from 'react'

export function useForceUpdate(): [updateCount: number, updateMethod: () => void] {
  const [state, setState] = useState(0)
  const forceUpdate = useCallback(() => setState((state) => state + 1), [])
  return [state, forceUpdate]
}
