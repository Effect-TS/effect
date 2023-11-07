/**
 * @since 2.0.0
 */
import { Context } from "../Context.js"
import type { DefaultServices } from "../DefaultServices.js"
import type { Effect } from "../Effect.js"
import * as core from "../internal/core.js"
import * as defaultServices from "../internal/defaultServices.js"
import type { TestLive } from "../TestLive.js"

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
