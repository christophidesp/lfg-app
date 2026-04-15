import { useEffect, useRef } from 'react'

const isDev = import.meta.env.DEV

// StrictMode mounts, unmounts (<50ms), then remounts. We suppress that
// first pair so the warning only fires on real re-mounts.
const STRICT_MODE_THRESHOLD_MS = 50

export function usePlacesTelemetry(componentName) {
  const mountCountRef = useRef(0)
  const mountTimeRef = useRef(null)
  const lastUnmountTimeRef = useRef(null)

  useEffect(() => {
    if (!isDev) return

    // If the previous unmount was <50ms ago, this is StrictMode's
    // synthetic remount — don't bump the counter.
    const timeSinceUnmount = lastUnmountTimeRef.current
      ? Date.now() - lastUnmountTimeRef.current
      : Infinity

    if (timeSinceUnmount < STRICT_MODE_THRESHOLD_MS) {
      mountTimeRef.current = Date.now()
      console.log(
        `%c[Places] MOUNT — ${componentName} (StrictMode remount, ignored)`,
        'color: #888;'
      )
      return () => {
        const lifetime = Date.now() - mountTimeRef.current
        lastUnmountTimeRef.current = Date.now()
        console.log(
          `%c[Places] UNMOUNT — ${componentName} (lifetime: ${lifetime}ms)`,
          'color: #888;'
        )
      }
    }

    mountCountRef.current += 1
    mountTimeRef.current = Date.now()
    const count = mountCountRef.current

    console.log(
      `%c[Places] MOUNT #${count} — ${componentName}`,
      'color: #E8C547; font-weight: 500;',
      { timestamp: new Date().toISOString() }
    )

    if (count > 1) {
      console.warn(
        `[Places] ${componentName} has mounted ${count} times in this session. ` +
        `Each mount creates a new session token. Verify this is intentional.`
      )
    }

    return () => {
      const lifetime = Date.now() - mountTimeRef.current
      lastUnmountTimeRef.current = Date.now()
      console.log(
        `%c[Places] UNMOUNT — ${componentName} (lifetime: ${lifetime}ms)`,
        'color: #888;'
      )
    }
  }, [componentName])
}
