import { Lazy } from "fp-ts/lib/function"
import React from "react"

// alpha
/* istanbul ignore file */

// example of hook interop
export function useInterval(callback: Lazy<void>, delay: number) {
  const savedCallback = React.useRef<Lazy<void>>()
  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      savedCallback.current!()
    }
    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}
