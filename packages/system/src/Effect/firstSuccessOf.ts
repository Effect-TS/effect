// ets_tracing: off

import * as A from "../Collections/Immutable/Array/index.js"
import * as NEA from "../Collections/Immutable/NonEmptyArray/index.js"
import { suspend } from "./core.js"
import type { Effect } from "./effect.js"
import { orElse_ } from "./orElse.js"

/**
 * Returns an effect that yields the value of the first
 * effect to succeed.
 */
export function firstSuccessOf<R, E, A>(
  effects: NEA.NonEmptyArray<Effect<R, E, A>>,
  __trace?: string
) {
  const first = NEA.head(effects)
  const rest = NEA.tail(effects)

  return suspend(() => A.reduce_(rest, first, (b, a) => orElse_(b, () => a)), __trace)
}
