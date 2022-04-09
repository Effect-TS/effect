/**
 * @tsplus static ets/FiberRef/Ops currentParallelism
 */
export const currentParallelism: LazyValue<FiberRef<Option<number>>> = LazyValue.make(
  () => FiberRef.unsafeMake(Option.none)
);
