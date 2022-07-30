/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects orElse
 * @tsplus pipeable effect/core/io/Effect orElse
 */
export function orElse<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E2, A | A2> => self.tryOrElse(that, Effect.succeed)
}

// TODO(Mike/Max): remove once https://github.com/ts-plus/typescript/issues/201 is resolved
/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @tsplus operator effect/core/io/Effect |
 */
export function orElseOp<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R | R2, E2, A | A2> {
  return self.tryOrElse(that, Effect.succeed)
}
