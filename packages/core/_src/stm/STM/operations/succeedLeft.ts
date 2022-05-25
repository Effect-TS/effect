/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static ets/STM/Ops left
 */
export function succeedLeft<A>(value: LazyArg<A>): USTM<Either<A, never>> {
  return STM.succeed(Either.left(value()))
}
