import { LiveClock } from "@effect/core/io/Clock/operations/live"

/**
 * @tsplus type effect/core/io/DefaultEnv.Ops
 */
export interface DefaultEnvOps {
  Services: DefaultServices
}
export const DefaultEnv: DefaultEnvOps = {
  Services: {}
}

/**
 * @tsplus type effect/core/io/DefaultEnv/Services.Ops
 */
export interface DefaultServices {}

/**
 * @tsplus static effect/core/io/DefaultEnv/Services.Ops live
 */
export const liveServices = LazyValue.make(() => Env(Clock.Tag, new LiveClock()).add(Random.Tag, Random.default.value))

/**
 * The default services.
 *
 * @tsplus static effect/core/io/DefaultEnv.Ops services
 */
export const services = LazyValue.make(() => FiberRef.unsafeMakeEnvironment(liveServices.value))
