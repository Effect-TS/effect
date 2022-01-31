// ets_tracing: off

import * as E from "../../../../Either/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as MapError from "./mapError.js"
import * as RightOrFail from "./rightOrFail.js"

/**
 * Fails with the error `None` if value is `Left`.
 */
export function right<R, E, A1, A2>(
  self: C.Stream<R, E, E.Either<A1, A2>>
): C.Stream<R, O.Option<E>, A2> {
  return RightOrFail.rightOrFail_(MapError.mapError_(self, O.some), () => O.none)
}
