import { useState, useEffect } from 'react'
import { getCountdown } from '../utils/format'

export function useCountdown(targetDate) {
  const [countdown, setCountdown] = useState(() => getCountdown(targetDate))

  useEffect(() => {
    if (!targetDate) return
    const timer = setInterval(() => {
      setCountdown(getCountdown(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return countdown
}
