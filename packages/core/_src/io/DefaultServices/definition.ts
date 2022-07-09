import { LiveClock } from "@effect/core/io/Clock/operations/live"

/**
 * @tsplus type effect/core/io/DefaultServices
 */
export type DefaultServices = Clock | Random

/**
 * @tsplus type effect/core/io/DefaultServices.Ops
 */
export interface DefaultServicesOps {}
export const DefaultServices: DefaultServicesOps = {}

/**
 * @tsplus static effect/core/io/DefaultServices.Ops live
 */
export const liveServices = Env(Clock.Tag, new LiveClock()).add(Random.Tag, Random.default)

/**
 * The default services.
 *
 * @tsplus static effect/core/io/DefaultServices.Ops currentServices
 */
export const currentServices = FiberRef.unsafeMakeEnvironment(liveServices)
