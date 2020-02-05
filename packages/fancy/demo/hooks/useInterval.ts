import * as React from "react";
import { Lazy } from "fp-ts/lib/function";

// alpha
/* istanbul ignore file */

// example of hook interop
export function useInterval(callback: Lazy<void>, delay: number) {
  const savedCallback = React.useRef<Lazy<void>>();
  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      savedCallback.current!!();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
