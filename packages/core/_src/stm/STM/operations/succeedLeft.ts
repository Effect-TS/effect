/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static effect/core/stm/STM.Ops left
 */
export function succeedLeft<A>(value: A): USTM<Either<A, never>> {
  return STM.succeed(Either.left(value))
}
