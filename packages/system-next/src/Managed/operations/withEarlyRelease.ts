// ets_tracing: off

import type { Tuple } from "../../Collections/Immutable/Tuple"
import type { Managed } from "../definition"
import type { UIO } from "./_internal/effect"
import * as Ex from "./_internal/exit"
import { chain_ } from "./chain"
import { fiberId as fiberIdManaged } from "./fiberId"
import { withEarlyReleaseExit_ } from "./withEarlyReleaseExit"

/**
 * Modifies this `Managed` to provide a canceler that can be used to eagerly
 * execute the finalizer of this `Managed`. The canceler will run
 * uninterruptibly with an exit value indicating that the effect was
 * interrupted, and if completed will cause the regular finalizer to not run.
 */
export function withEarlyRelease<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, Tuple<[UIO<any>, A]>> {
  return chain_(
    fiberIdManaged,
    (id) => withEarlyReleaseExit_(self, Ex.interrupt(id)),
    __trace
  )
}
