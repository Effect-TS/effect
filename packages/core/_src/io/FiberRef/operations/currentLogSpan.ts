/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogSpan
 */
export const currentLogSpan: FiberRef<List<LogSpan>, (a: List<LogSpan>) => List<LogSpan>> = FiberRef.unsafeMake(
  List.empty<LogSpan>()
)
