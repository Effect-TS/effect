/**
 * @tsplus static effect/core/io/FiberRef.Ops currentParallelism
 */
export const currentParallelism: LazyValue<FiberRef<Maybe<never>, (a: Maybe<never>) => Maybe<never>>> = LazyValue
  .make(
    () => FiberRef.unsafeMake(Maybe.none)
  )
