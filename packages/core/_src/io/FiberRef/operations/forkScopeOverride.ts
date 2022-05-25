/**
 * @tsplus static ets/FiberRef/Ops forkScopeOverride
 */
export const forkScopeOverride: LazyValue<FiberRef<Option<never>, (a: Option<never>) => Option<never>>> = LazyValue
  .make(() => FiberRef.unsafeMake(Option.none, () => Option.none))
