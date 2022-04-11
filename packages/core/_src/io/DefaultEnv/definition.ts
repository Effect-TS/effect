export type DefaultEnv = Has<Clock> & Has<Random>

/**
 * @tsplus type ets/DefaultEnv/Ops
 */
export interface DefaultEnvOps {}
export const DefaultEnv: DefaultEnvOps = {};

export const services: LazyValue<FiberRef<DefaultEnv>> = LazyValue.make(() =>
  FiberRef.unsafeMake()
)
