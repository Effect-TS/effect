// tracing: off

import * as A from "../Array"
import * as NEA from "../NonEmptyArray"
import { suspend } from "./core"
import type { Effect } from "./effect"
import { orElse_ } from "./orElse"
import { traceAfter_ } from "./traceAfter"

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

  return traceAfter_(
    suspend(() => A.reduce_(rest, first, (b, a) => orElse_(b, () => a))),
    __trace
  )
}
