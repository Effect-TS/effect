// ets_tracing: off

import { succeedWith, suspend } from "./core.js"
import { effectAsyncInterrupt } from "./effectAsyncInterrupt.js"

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never = suspend(() =>
  effectAsyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return succeedWith(() => {
      clearInterval(interval)
    })
  })
)
