/**
 * @tsplus static ets/FiberRef/Ops currentParallelism
 */
export const currentParallelism: LazyValue<FiberRef<Option<never>, (a: Option<never>) => Option<never>>> = LazyValue
  .make(
    () => FiberRef.unsafeMake(Option.none)
  )
