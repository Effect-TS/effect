/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipRight
 * @tsplus pipeable effect/core/io/Effect zipRight
 */
export function zipRight<R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A2> => self.flatMap(that)
}

// TODO(Mike/Max): remove once https://github.com/ts-plus/typescript/issues/201 is resolved
/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @tsplus operator effect/core/io/Effect >
 */
export function zipRightOp<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, A2> {
  return self.flatMap(that)
}
