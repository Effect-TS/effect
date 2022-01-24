import type { Fiber } from "../../Fiber"
import { join } from "../../Fiber/operations/join"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @ets static ets/EffectOps fromFiberEffect
 */
export function fromFiberEffect<R, E, A>(
  fiber: Effect<R, E, Fiber<E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return suspendSucceed(() => chain_(fiber, join), __trace)
}
