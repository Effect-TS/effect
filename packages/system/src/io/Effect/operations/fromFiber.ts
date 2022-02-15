import type { LazyArg } from "../../../data/Function"
import type { Fiber } from "../../Fiber"
import { join } from "../../Fiber/operations/join"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @tsplus static ets/EffectOps fromFiber
 */
export function fromFiber<E, A>(
  fiber: LazyArg<Fiber<E, A>>,
  __etsTrace?: string
): IO<E, A> {
  return Effect.succeed(fiber).flatMap(join)
}
