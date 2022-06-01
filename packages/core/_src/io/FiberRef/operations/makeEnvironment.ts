/**
 * Creates a new `FiberRef` with specified initial value of the environment,
 * using `Service.Env.Patch` to combine updates to the environment in a
 * compositional manner.
 *
 * @tsplus static ets/FiberRef/Ops makeEnvironment
 */
export function makeEnvironment<A>(
  initial: LazyArg<Service.Env<A>>,
  __tsplusTrace?: string
): Effect<Scope, never, FiberRef<Service.Env<A>, Service.Patch<A, A>>> {
  return FiberRef.makeWith(FiberRef.unsafeMakeEnvironment(initial()))
}
