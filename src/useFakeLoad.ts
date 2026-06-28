import { useEffect, useState } from 'react'

// Simulates async fetch latency so skeleton states (never spinners) are exercised.
export function useFakeLoad(delay = 650): boolean {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const timer = window.setTimeout(() => setIsLoading(false), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  return isLoading
}
