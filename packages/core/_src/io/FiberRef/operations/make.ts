/**
 * Creates a new `FiberRef` with given initial value.
 *
 * @tsplus static ets/FiberRef/Ops make
 */
export function make<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a,
  __tsplusTrace?: string
): UIO<FiberRef<A>> {
  return Effect.suspendSucceed(() => {
    const ref = FiberRef.unsafeMake(initial, fork, join);
    return ref.update(identity).as(ref);
  });
}
