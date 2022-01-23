import { constVoid } from "../../data/Function"
import type * as O from "../../data/Option"
import type { Effect, UIO } from "../Effect"
import type { Exit } from "../Exit"
import type * as Fiber from "../Fiber"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

/**
 * A `Supervisor<A>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `A` from the supervision.
 */
export class Supervisor<A> {
  constructor(
    /**
     * Returns an effect that succeeds with the value produced by this
     * supervisor. This value may change over time, reflecting what the
     * supervisor produces as it supervises fibers.
     */
    readonly value: UIO<A>,
    readonly unsafeOnStart: <R, E, A>(
      environment: R,
      effect: Effect<R, E, A>,
      parent: O.Option<Fiber.Runtime<any, any>>,
      fiber: Fiber.Runtime<E, A>
    ) => void,
    readonly unsafeOnEnd: <E, A>(exit: Exit<E, A>, fiber: Fiber.Runtime<E, A>) => void,
    readonly unsafeOnEffect: <E, A>(
      fiber: Fiber.Runtime<E, A>,
      effect: Effect<any, any, any>
    ) => void = constVoid,
    readonly unsafeOnSuspend: <E, A>(fiber: Fiber.Runtime<E, A>) => void = constVoid,
    readonly unsafeOnResume: <E, A>(fiber: Fiber.Runtime<E, A>) => void = constVoid
  ) {}
}
