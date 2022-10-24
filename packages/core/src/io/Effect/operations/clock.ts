/**
 * Retreives the `Clock` service from the environment.
 *
 * @tsplus static effect/core/io/Effect.Ops clock
 * @category getters
 * @since 1.0.0
 */
export const clock: Effect<never, never, Clock> = Effect.clockWith(Effect.succeed)
