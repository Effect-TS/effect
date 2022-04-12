/**
 * @tsplus static ets/FiberRef/Ops makeWith
 */
export function makeWith<Value, Patch>(
  ref: LazyArg<FiberRef.WithPatch<Value, Patch>>,
  __tsplusTrace?: string
): Effect<Has<Scope>, never, FiberRef.WithPatch<Value, Patch>> {
  return Effect.acquireRelease(
    Effect.succeed(ref).tap((ref) => ref.update(identity)),
    (ref) => ref.delete()
  );
}
