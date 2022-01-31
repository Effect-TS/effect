// ets_tracing: off

import type * as C from "../core.js"
import * as Succeed from "./succeed.js"

/**
 * A stream that contains a single `Unit` value.
 */
export const unit: C.UIO<void> = Succeed.succeed(undefined)
