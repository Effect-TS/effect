/**
 * @tsplus static ets/FiberRef/Ops currentLogSpan
 */
export const currentLogSpan: LazyValue<FiberRef<List<LogSpan>, (a: List<LogSpan>) => List<LogSpan>>> = LazyValue.make(
  () => FiberRef.unsafeMake(List.empty<LogSpan>())
);
