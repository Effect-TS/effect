// tracing: off

import { accessCallTrace } from "@effect-ts/tracing-utils"

import { chain_, unit } from "./core"
import type { Effect } from "./effect"

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @trace call
 */
export function asUnit<R, E, X>(self: Effect<R, E, X>) {
  return chain_(self, () => unit, accessCallTrace())
}
