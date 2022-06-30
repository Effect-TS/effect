/**
 * @tsplus static effect/core/io/FiberRef.Ops forkScopeOverride
 */
export const forkScopeOverride: LazyValue<FiberRef<Maybe<never>, (a: Maybe<never>) => Maybe<never>>> = LazyValue
  .make(() => FiberRef.unsafeMake(Maybe.none, () => Maybe.none))
