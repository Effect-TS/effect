// ets_tracing: off

import { pipe } from "../Function/index.js"
import { getAndSet, makeRef } from "../Ref/index.js"
import type { Effect, UIO } from "./effect.js"
import * as map from "./map.js"
import { whenM_ } from "./whenM.js"

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
