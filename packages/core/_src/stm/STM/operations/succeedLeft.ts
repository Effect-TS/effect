/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static effect/core/stm/STM.Ops left
 */
export function succeedLeft<A>(value: LazyArg<A>): USTM<Either<A, never>> {
  return STM.sync(Either.left(value()))
}
