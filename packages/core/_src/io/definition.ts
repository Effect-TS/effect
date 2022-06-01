import { LiveClock } from "@effect/core/io/Clock/operations/live"

/**
 * @tsplus type ets/DefaultEnv/Ops
 */
export interface DefaultEnvOps {
  Services: DefaultServices
}
export const DefaultEnv: DefaultEnvOps = {
  Services: {}
}

/**
 * @tsplus type ets/DefaultEnv/Services/Ops
 */
export interface DefaultServices {}

/**
 * @tsplus static ets/DefaultEnv/Services/Ops live
 */
export const liveServices = LazyValue.make(() => Env(Clock.Tag, new LiveClock()).add(Random.Tag, Random.default.value))

/**
 * The default services.
 *
 * @tsplus static ets/DefaultEnv/Ops services
 */
export const services = LazyValue.make(() => FiberRef.unsafeMakeEnvironment(liveServices.value))
