// ets_tracing: off

import { left } from "../../Either"
import type { UIO } from "../definition"
import { asyncInterrupt } from "./asyncInterrupt"
import { succeed } from "./succeed"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never: UIO<never> = suspendSucceed(() =>
  asyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return left(
      succeed(() => {
        clearInterval(interval)
      })
    )
  })
)
