import { useCallback, useEffect, useRef, useState } from 'react'

export const DATA_EVENT = 'wismaku-internal:data-changed'

export function useData(loader, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const depsKey = deps.join('|')
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  }, [loader, depsKey])

  const refresh = useCallback(async () => {
    try {
      const res = await loaderRef.current()
      setData(res)
      setError(null)
    } catch (err) {
      setError(err)
      setData([])
    }
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(DATA_EVENT, refresh)
    return () => window.removeEventListener(DATA_EVENT, refresh)
  }, [refresh, depsKey])

  return { data, error, refresh }
}
