// ets_tracing: off

import * as O from "../../../../Option"
import type * as C from "../core"
import * as MapError from "./mapError"
import * as SomeOrFail from "./someOrFail"

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, A>(self: C.Stream<R, E, O.Option<A>>) {
  return SomeOrFail.someOrFail_(MapError.mapError_(self, O.some), O.none)
}
