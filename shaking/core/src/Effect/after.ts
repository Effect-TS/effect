import { Async } from "../Support/Common/effect"

import { accessRuntime } from "./accessRuntime"
import { asyncTotal } from "./asyncTotal"
import { chain_ } from "./chain"

/**
 * Create an IO that produces void after ms milliseconds
 * @param ms
 */
export function after(ms: number): Async<void> {
  return chain_(accessRuntime, (runtime) =>
    asyncTotal((callback) => runtime.dispatchLater(callback, undefined, ms))
  )
}
