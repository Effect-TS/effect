// tracing: off

import { accessCallTrace } from "@effect-ts/tracing-utils"

import * as O from "../Option"
import type { Effect } from "./effect"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to an optional value.
 *
 * @trace call
 */
export function asSomeError<R, E, A>(self: Effect<R, E, A>) {
  return mapError_(self, O.some, accessCallTrace())
}
