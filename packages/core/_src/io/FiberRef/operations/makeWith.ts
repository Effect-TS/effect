/**
 * @tsplus static ets/FiberRef/Ops makeWith
 */
export function makeWith<Value, Patch>(
  ref: LazyArg<FiberRef<Value, Patch>>,
  __tsplusTrace?: string
): Effect<Has<Scope>, never, FiberRef<Value, Patch>> {
  return Effect.acquireRelease(
    Effect.succeed(ref).tap((ref) => ref.update(identity)),
    (ref) => ref.delete()
  )
}
