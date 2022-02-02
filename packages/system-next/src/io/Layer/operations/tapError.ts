import { Effect } from "../../Effect"
import { Layer } from "../definition"

/**
 * Performs the specified effect if this layer fails.
 *
 * @tsplus fluent ets/Layer tapError
 */
export function tapError_<RIn, E, ROut, RIn2, E2, X>(
  self: Layer<RIn, E, ROut>,
  f: (e: E) => Effect<RIn2, E2, X>
): Layer<RIn & RIn2, E | E2, ROut> {
  return self.catchAll((e) =>
    Layer.fromRawEffect(f(e).flatMap(() => Effect.failNow(e)))
  )
}

/**
 * Performs the specified effect if this layer fails.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, RIn2, E2, X>(f: (e: E) => Effect<RIn2, E2, X>) {
  return <RIn, ROut>(self: Layer<RIn, E, ROut>): Layer<RIn & RIn2, E | E2, ROut> =>
    self.tapError(f)
}
