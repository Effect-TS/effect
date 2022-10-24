import { LiveClock } from "@effect/core/io/Clock/operations/live"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * @tsplus type effect/core/io/DefaultServices
 * @category model
 * @since 1.0.0
 */
export type DefaultServices = Clock | Random

/**
 * @tsplus type effect/core/io/DefaultServices.Ops
 * @category constructors
 * @since 1.0.0
 */
export interface DefaultServicesOps {}
export const DefaultServices: DefaultServicesOps = {}

/**
 * @tsplus static effect/core/io/DefaultServices.Ops live
 * @category constructors
 * @since 1.0.0
 */
export const liveServices: Context.Context<DefaultServices> = pipe(
  Context.empty(),
  Context.add(Clock.Tag)(new LiveClock()),
  Context.add(Random.Tag)(Random.default)
)

/**
 * The default services.
 *
 * @tsplus static effect/core/io/DefaultServices.Ops currentServices
 * @category fiberRefs
 * @since 1.0.0
 */
export const currentServices = FiberRef.unsafeMakeEnvironment(liveServices)
