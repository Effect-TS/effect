/**
 * Returns an effect with the value on the right part.
 *
 * @tsplus static effect/core/stm/STM.Ops right
 */
export function succeedRight<A>(value: A): USTM<Either<never, A>> {
  return STM.succeed(Either.right(value))
}
