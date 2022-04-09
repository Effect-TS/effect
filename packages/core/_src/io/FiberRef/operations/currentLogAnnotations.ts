/**
 * @tsplus static ets/FiberRef/Ops currentLogAnnotations
 */
export const currentLogAnnotations: LazyValue<FiberRef<Map<string, string>>> = LazyValue.make(() =>
  FiberRef.unsafeMake(new Map())
);
