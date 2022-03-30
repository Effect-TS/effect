import type { Effect } from "../../Effect"
import { Layer } from "../definition"

/**
 * Performs the specified effect if this layer succeeds.
 *
 * @tsplus fluent ets/Layer tap
 */
export function tap_<RIn, E, ROut, RIn2, E2, X>(
  self: Layer<RIn, E, ROut>,
  f: (_: ROut) => Effect<RIn2, E2, X>
): Layer<RIn & RIn2, E | E2, ROut> {
  return self.flatMap((environment) =>
    Layer.fromRawEffect(f(environment).map(() => environment))
  )
}

/**
 * Performs the specified effect if this layer succeeds.
 */
export const tap = Pipeable(tap_)
