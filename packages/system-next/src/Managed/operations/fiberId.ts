// ets_tracing: off

import type { FiberId } from "../../FiberId/definition"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * Returns an effect that succeeds with the `FiberId` of the caller.
 */
export const fiberId: Managed<unknown, never, FiberId> = fromEffect(T.fiberId)
