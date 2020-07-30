import { effectAsyncInterrupt } from "./effectAsyncInterrupt"
import { effectTotal } from "./effectTotal"
import { suspend } from "./suspend"

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never = suspend(() =>
  effectAsyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return effectTotal(() => {
      clearInterval(interval)
    })
  })
)
