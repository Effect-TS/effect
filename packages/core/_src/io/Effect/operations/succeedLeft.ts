/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static ets/Effect/Ops left
 */
export function succeedLeft<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): UIO<Either<A, never>> {
  return Effect.succeed(Either.left(value()));
}
