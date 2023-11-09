/**
 * @since 2.0.0
 */
import { Context } from "./exports/Context.js"
import type { DefaultServices } from "./exports/DefaultServices.js"
import type { Effect } from "./exports/Effect.js"
import type { TestLive } from "./exports/TestLive.js"
import * as core from "./internal/core.js"
import * as defaultServices from "./internal/defaultServices.js"

/**
 * @since 2.0.0
 */
export const TestLiveTypeId = Symbol.for("effect/TestLive")

/**
 * @since 2.0.0
 */
export type TestLiveTypeId = typeof TestLiveTypeId

/**
 * @since 2.0.0
 */
export const Tag: Context.Tag<TestLive, TestLive> = Context.Tag<TestLive>(
  Symbol.for("effect/TestLive")
)

/** @internal */
class LiveImpl implements TestLive {
  readonly [TestLiveTypeId]: TestLiveTypeId = TestLiveTypeId
  constructor(readonly services: Context<DefaultServices>) {}
  provide<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
    return core.fiberRefLocallyWith(
      defaultServices.currentServices,
      Context.merge(this.services)
    )(effect)
  }
}

/**
 * @since 2.0.0
 */
export const make = (services: Context<DefaultServices>): TestLive => new LiveImpl(services)
