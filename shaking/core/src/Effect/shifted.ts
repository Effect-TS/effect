import { Async } from "../Support/Common/effect"

import { accessRuntime } from "./accessRuntime"
import { asyncTotal } from "./asyncTotal"
import { chain_ } from "./chain"
import { uninterruptible } from "./uninterruptible"

/**
 * Introduce a gap in executing to allow other fibers to execute (if any are pending)
 */
export const shifted: Async<void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) => {
      runtime.dispatch(callback, undefined)
      return (cb) => {
        cb()
      }
    })
  )
)
