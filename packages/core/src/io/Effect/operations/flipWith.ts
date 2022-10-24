/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @tsplus static effect/core/io/Effect.Aspects flipWith
 * @tsplus pipeable effect/core/io/Effect flipWith
 * @category mutations
 * @since 1.0.0
 */
export function flipWith<R, A, E, R2, A2, E2>(f: (self: Effect<R, A, E>) => Effect<R2, A2, E2>) {
  return (self: Effect<R, E, A>): Effect<R2, E2, A2> => f(self.flip).flip
}
