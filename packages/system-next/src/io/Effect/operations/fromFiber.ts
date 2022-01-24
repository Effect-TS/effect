import type { Fiber } from "../../Fiber"
import { join } from "../../Fiber/operations/join"
import type { IO } from "../definition"
import { chain_ } from "./chain"
import { succeed } from "./succeed"

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @ets static ets/EffectOps fromFiber
 */
export function fromFiber<E, A>(fiber: Fiber<E, A>, __etsTrace?: string): IO<E, A> {
  return chain_(
    succeed(() => fiber),
    join
  )
}
