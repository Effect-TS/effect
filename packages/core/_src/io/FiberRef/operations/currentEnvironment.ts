/**
 * @tsplus static ets/FiberRef/Ops currentEnvironment
 */
export const currentEnvironment: LazyValue<FiberRef<any>> = LazyValue.make(() => FiberRef.unsafeMake({}, identity));
