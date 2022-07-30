/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static effect/core/io/Effect.Ops left
 */
export function succeedLeft<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): Effect<never, never, Either<A, never>> {
  return Effect.sync(Either.left(value()))
}
