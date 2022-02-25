import type { LazyArg } from "../../../data/Function"
import type { Fiber } from "../../Fiber"
import { join } from "../../Fiber/operations/join"
import { Effect } from "../definition"

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @tsplus static ets/EffectOps fromFiberEffect
 */
export function fromFiberEffect<R, E, A>(
  fiber: LazyArg<Effect<R, E, Fiber<E, A>>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(fiber().flatMap(join))
}
