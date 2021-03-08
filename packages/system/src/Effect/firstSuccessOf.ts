// tracing: off

import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import * as A from "../Array"
import * as NEA from "../NonEmptyArray"
import { suspend } from "./core"
import type { Effect } from "./effect"
import { orElse_ } from "./orElse"

/**
 * Returns an effect that yields the value of the first
 * effect to succeed.
 *
 * @trace call
 */
export function firstSuccessOf<R, E, A>(effects: NEA.NonEmptyArray<Effect<R, E, A>>) {
  const trace = accessCallTrace()

  const first = NEA.head(effects)
  const rest = NEA.tail(effects)

  return suspend(
    traceFrom(trace, () => A.reduce_(rest, first, (b, a) => orElse_(b, () => a)))
  )
}
