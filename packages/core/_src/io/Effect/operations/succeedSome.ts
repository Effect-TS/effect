/**
 * Returns an effect with the optional value.
 *
 * @tsplus static ets/Effect/Ops some
 */
export function succeedSome<A>(value: LazyArg<A>, __tsplusTrace?: string): Effect.UIO<Option<A>> {
  return Effect.succeed(Option.some(value()));
}
