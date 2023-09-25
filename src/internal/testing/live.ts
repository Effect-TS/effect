import * as Context from "../../Context"
import type * as DefaultServices from "../../DefaultServices"
import type * as Effect from "../../Effect"
import * as core from "../../internal/core"
import * as defaultServices from "../../internal/defaultServices"

/** @internal */
export const LiveTypeId = Symbol.for("@effect/test/Live")

/** @internal */
export type LiveTypeId = typeof LiveTypeId

/**
 * The `Live` trait provides access to the "live" default Effect services from
 * within tests for workflows such as printing test results to the console or
 * timing out tests where it is necessary to access the real implementations of
 * these services.
 *
 * @internal
 */
export interface Live {
  readonly [LiveTypeId]: LiveTypeId
  provide<R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}

/** @internal */
export const Live: Context.Tag<Live, Live> = Context.Tag<Live>(
  Symbol.for("@effect/test/Live")
)

/** @internal */
class LiveImpl implements Live {
  readonly [LiveTypeId]: LiveTypeId = LiveTypeId
  constructor(readonly services: Context.Context<DefaultServices.DefaultServices>) {}
  provide<R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> {
    return core.fiberRefLocallyWith(
      defaultServices.currentServices,
      Context.merge(this.services)
    )(effect)
  }
}

/** @internal */
export const make = (services: Context.Context<DefaultServices.DefaultServices>): Live => new LiveImpl(services)
