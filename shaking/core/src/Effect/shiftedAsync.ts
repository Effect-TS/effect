import { Async } from "../Support/Common/effect"

import { accessRuntime } from "./accessRuntime"
import { asyncTotal } from "./asyncTotal"
import { chain_ } from "./chain"
import { uninterruptible } from "./uninterruptible"

/**
 * Introduce an asynchronous gap that will suspend the runloop and return control to the javascript vm
 */
export const shiftedAsync: Async<void> =
  /*#__PURE__*/
  (() =>
    uninterruptible(
      chain_(accessRuntime, (runtime) =>
        asyncTotal<void>((callback) => runtime.dispatchLater(callback, undefined, 0))
      )
    ))()
