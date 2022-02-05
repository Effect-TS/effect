// ets_tracing: off

import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as MapError from "./mapError.js"
import * as SomeOrFail from "./someOrFail.js"

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, A>(
  self: C.Stream<R, E, O.Option<A>>
): C.Stream<R, O.Option<E>, A> {
  return SomeOrFail.someOrFail_(MapError.mapError_(self, O.some), () => O.none)
}
