/**
 * @tsplus static effect/core/io/FiberRef.Ops currentEnvironment
 */
export const currentEnvironment: LazyValue<FiberRef<Env<never>, (a: Env<never>) => Env<never>>> = LazyValue.make(
  () => FiberRef.unsafeMake(Env.empty)
)
