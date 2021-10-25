// ets_tracing: off

import type * as C from "../core"
import * as Succeed from "./succeed"

/**
 * A stream that contains a single `Unit` value.
 */
export const unit: C.UIO<void> = Succeed.succeed(undefined)
