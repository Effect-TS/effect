/**
 * Retreives the `Random` service from the environment.
 *
 * @tsplus static effect/core/io/Effect.Ops random
 * @category getters
 * @since 1.0.0
 */
export const random: Effect<never, never, Random> = Effect.randomWith(Effect.succeed)
