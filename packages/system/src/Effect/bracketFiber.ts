import type { Runtime } from "../Fiber/core"
import { bracket_ } from "./bracket"
import { chain_ } from "./core"
import { forkDaemon } from "./core-scope"
import type { Effect } from "./effect"
import { fiberId } from "./fiberId"

/**
 * Fork the effect into a separate fiber wrapping it in a bracket and returining the
 * `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @trace 1
 */
export function bracketFiber_<R, E, A, R2, E2, A2>(
  effect: Effect<R, E, A>,
  use: (f: Runtime<E, A>) => Effect<R2, E2, A2>
) {
  return bracket_(forkDaemon(effect), (f) => chain_(fiberId(), f.interruptAs), use)
}

/**
 * Fork the effect into a separate fiber wrapping it in a bracket.
 * Acquisition will fork and release will interrupt the fiber.
 *
 * @dataFirst bracketFiber_
 * @trace 0
 */
export function bracketFiber<R2, E2, A2, E, A>(
  use: (f: Runtime<E, A>) => Effect<R2, E2, A2>
) {
  return <R>(effect: Effect<R, E, A>) => bracketFiber_(effect, use)
}
