/**
 * @tsplus static ets/FiberRef/Ops currentEnvironment
 */
export const currentEnvironment: LazyValue<FiberRef<Env<unknown>, (a: Env<unknown>) => Env<unknown>>> = LazyValue.make(
  () => FiberRef.unsafeMake(Env.empty)
);
