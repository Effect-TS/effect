/**
 * @tsplus static ets/FiberRef/Ops currentEnvironment
 */
export const currentEnvironment: LazyValue<FiberRef<Env<any>>> = LazyValue.make(() => FiberRef.unsafeMake(Env()));
