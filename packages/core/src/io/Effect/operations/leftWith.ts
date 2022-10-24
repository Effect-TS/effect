import type * as Either from "@fp-ts/data/Either"
/**
 * Performs the specified operation while "zoomed in" on the `Left` case of an
 * `Either`.
 *
 * @tsplus static effect/core/io/Effect.Aspects leftWith
 * @tsplus pipeable effect/core/io/Effect leftWith
 * @category mutations
 * @since 1.0.0
 */
export function leftWith<R, E, B, A, R1, E1, B1, A1>(
  f: (effect: Effect<R, Either.Either<E, B>, A>) => Effect<R1, Either.Either<E1, B1>, A1>
) {
  return (self: Effect<R, E, Either.Either<A, B>>): Effect<R | R1, E | E1, Either.Either<A1, B1>> =>
    Effect.suspendSucceed(f(self.left).unleft)
}
