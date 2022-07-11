/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogAnnotations
 */
export const currentLogAnnotations: FiberRef<
  ImmutableMap<string, string>,
  (a: ImmutableMap<string, string>) => ImmutableMap<string, string>
> = FiberRef.unsafeMake(ImmutableMap.empty())
