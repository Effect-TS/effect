/**
 * Returns an effect with the value on the right part.
 *
 * @tsplus static effect/core/io/Effect.Ops right
 */
export function succeedRight<A>(
  value: LazyArg<A>
): Effect<never, never, Either<never, A>> {
  return Effect.sync(Either.right(value()))
}
