// ets_tracing: off

import type { UIO } from "../../Effect/definition/base"
import type { Exit } from "../../Exit/definition"
import type { Fiber } from "../definition"

/**
 * Awaits the fiber, which suspends the awaiting fiber until the result of the
 * fiber has been determined.
 */
function _await<E, A>(self: Fiber<E, A>, __trace?: string): UIO<Exit<E, A>> {
  return self.await
}

export { _await as await }
