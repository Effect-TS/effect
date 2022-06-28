/**
 * Retreives the `Clock` service from the environment.
 *
 * @tsplus static effect/core/io/Effect.Ops clock
 */
export const clock: Effect<never, never, Clock> = Effect.clockWith(Effect.succeedNow)
