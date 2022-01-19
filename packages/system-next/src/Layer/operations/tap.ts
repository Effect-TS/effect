import type { Effect } from "../../Effect"
import { map_ as mapEffect_ } from "../../Effect/operations/map"
import type { Layer } from "../definition"
import { chain_ } from "./chain"
import { fromRawEffect } from "./fromRawEffect"

/**
 * Performs the specified effect if this layer succeeds.
 */
export function tap_<RIn, E, ROut, RIn2, E2, X>(
  self: Layer<RIn, E, ROut>,
  f: (_: ROut) => Effect<RIn2, E2, X>
): Layer<RIn & RIn2, E | E2, ROut> {
  return chain_(self, (environment) =>
    fromRawEffect(mapEffect_(f(environment), () => environment))
  )
}

/**
 * Performs the specified effect if this layer succeeds.
 *
 * @ets_data_first tap_
 */
export function tap<ROut, RIn2, E2, X>(f: (_: ROut) => Effect<RIn2, E2, X>) {
  return <RIn, E>(self: Layer<RIn, E, ROut>): Layer<RIn & RIn2, E | E2, ROut> =>
    tap_(self, f)
}
