/**
 * @tsplus static effect/core/io/FiberRef.Ops forkScopeOverride
 */
export const forkScopeOverride: FiberRef<Maybe<never>, (a: Maybe<never>) => Maybe<never>> = FiberRef.unsafeMake(
  Maybe.none,
  () => Maybe.none
)
