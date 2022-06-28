/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipLeft
 * @tsplus pipeable effect/core/io/Effect zipLeft
 */
export function zipLeft<R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> => self.flatMap((a) => that().as(a))
}

// TODO(Mike/Max): remove once https://github.com/ts-plus/typescript/issues/201 is resolved
/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @tsplus operator effect/core/io/Effect <
 */
export function zipLeftOp<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, A> {
  return self.flatMap((a) => that().as(a))
}
