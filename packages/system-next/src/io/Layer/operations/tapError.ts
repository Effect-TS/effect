import type { Effect } from "../../Effect"
import { chain_ as chainEffect_ } from "../../Effect/operations/chain"
import { failNow } from "../../Effect/operations/failNow"
import type { Layer } from "../definition"
import { catchAll_ } from "./catchAll"
import { fromRawEffect } from "./fromRawEffect"

/**
 * Performs the specified effect if this layer fails.
 */
export function tapError_<RIn, E, ROut, RIn2, E2, X>(
  self: Layer<RIn, E, ROut>,
  f: (e: E) => Effect<RIn2, E2, X>
): Layer<RIn & RIn2, E | E2, ROut> {
  return catchAll_(self, (e) => fromRawEffect(chainEffect_(f(e), () => failNow(e))))
}

/**
 * Performs the specified effect if this layer fails.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, RIn2, E2, X>(f: (e: E) => Effect<RIn2, E2, X>) {
  return <RIn, ROut>(self: Layer<RIn, E, ROut>): Layer<RIn & RIn2, E | E2, ROut> =>
    tapError_(self, f)
}
