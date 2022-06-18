/**
 * Retreives the `Random` service from the environment.
 *
 * @tsplus static ets/Effect/Ops random
 */
export const random: Effect<never, never, Random> = Effect.randomWith(Effect.succeedNow)
