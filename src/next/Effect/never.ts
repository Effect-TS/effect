import { effectAsyncInterrupt } from "./effectAsyncInterrupt"
import { effectTotal } from "./effectTotal"

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never =
  
  effectAsyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return effectTotal(() => {
      clearInterval(interval)
    })
  })
