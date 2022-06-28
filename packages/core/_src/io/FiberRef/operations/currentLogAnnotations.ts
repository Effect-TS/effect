/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogAnnotations
 */
export const currentLogAnnotations: LazyValue<
  FiberRef<
    ImmutableMap<string, string>,
    (a: ImmutableMap<string, string>) => ImmutableMap<string, string>
  >
> = LazyValue
  .make(() => FiberRef.unsafeMake(ImmutableMap.empty()))
