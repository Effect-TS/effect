import type { Runtime } from "../Fiber/core"
import { bracket_ } from "./bracket_"
import { chain_ } from "./core"
import type { Effect } from "./effect"
import { fiberId } from "./fiberId"
import { forkDaemon } from "./scope"

/**
 * Fork the effect into a separate fiber wrapping it in a bracket and returining the
 * `use` handle. Acquisition will fork and release will interrupt the fiber
 */
export function bracketFiber_<R, E, A, R2, E2, A2>(
  effect: Effect<R, E, A>,
  use: (f: Runtime<E, A>) => Effect<R2, E2, A2>
) {
  return bracket_(
    forkDaemon(effect),
    (f) => chain_(fiberId(), (id) => f.interruptAs(id)),
    use
  )
}
