/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @tsplus static effect/core/io/Effect.Ops ifEffect
 * @category constructors
 * @since 1.0.0
 */
export function ifEffect<R, R1, R2, E, E1, E2, A, A1>(
  b: Effect<R, E, boolean>,
  onTrue: Effect<R1, E1, A>,
  onFalse: Effect<R2, E2, A1>
): Effect<R | R1 | R2, E | E1 | E2, A | A1> {
  return b.flatMap((b): Effect<R1 | R2, E1 | E2, A | A1> => (b ? onTrue : onFalse))
}
