/**
 * Returns the `FiberId` of the fiber executing the effect that calls this
 * method.
 *
 * @tsplus static ets/Effect/Ops fiberId
 */
export const fiberId: Effect<never, never, FiberId> = Effect.descriptor.map((descriptor) => descriptor.id)
