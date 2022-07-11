/**
 * @tsplus static effect/core/io/FiberRef.Ops currentParallelism
 */
export const currentParallelism: FiberRef<Maybe<never>, (a: Maybe<never>) => Maybe<never>> = FiberRef.unsafeMake(
  Maybe.none
)
