// ets_tracing: off

import { pipe } from "../Function"
import { getAndSet, makeRef } from "../Ref"
import type { Effect, UIO } from "./effect"
import * as map from "./map"
import { whenM_ } from "./whenM"

/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 */
export function once<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): UIO<Effect<R, E, void>> {
  return pipe(
    makeRef(true),
    map.map((r) => whenM_(self, getAndSet(false)(r)), __trace)
  )
}
