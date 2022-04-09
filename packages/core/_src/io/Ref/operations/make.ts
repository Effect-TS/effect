/**
 * Creates a new `Ref` with the specified value.
 *
 * @tsplus static ets/Ref/Ops make
 */
export function make<A>(value: LazyArg<A>, __tsplusTrace?: string): UIO<Ref<A>> {
  return Effect.succeed(Ref.unsafeMake(value()));
}
