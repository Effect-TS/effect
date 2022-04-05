/**
 * @tsplus static ets/FiberRef/Ops forkScopeOverride
 */
export const forkScopeOverride: LazyValue<FiberRef<Option<FiberScope>>> = LazyValue.make(() =>
  FiberRef.unsafeMake(
    Option.none,
    () => Option.none,
    (a, _) => a
  )
);
