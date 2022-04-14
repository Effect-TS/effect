/**
 * @tsplus static ets/FiberRef/Ops currentLogAnnotations
 */
export const currentLogAnnotations: LazyValue<FiberRef<Map<any, any>, (a: Map<any, any>) => Map<any, any>>> = LazyValue
  .make(() => FiberRef.unsafeMake(new Map()));
