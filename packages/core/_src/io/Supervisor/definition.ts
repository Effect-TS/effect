// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

/**
 * A `Supervisor<A>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `A` from the supervision.
 *
 * @tsplus type ets/Supervisor
 * @tsplus companion ets/Supervisor/Ops
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
      environment: Env<R>,
      effect: Effect<R, E, A>,
      parent: Option<Fiber.Runtime<any, any>>,
      fiber: Fiber.Runtime<E, A>
    ) => void,
    readonly unsafeOnEnd: <E, A>(exit: Exit<E, A>, fiber: Fiber.Runtime<E, A>) => void,
    readonly unsafeOnEffect: <E, A>(
      fiber: Fiber.Runtime<E, A>,
      effect: Effect<any, any, any>
    ) => void = () => undefined,
    readonly unsafeOnSuspend: <E, A>(fiber: Fiber.Runtime<E, A>) => void = () => undefined,
    readonly unsafeOnResume: <E, A>(fiber: Fiber.Runtime<E, A>) => void = () => undefined
  ) {}
}
