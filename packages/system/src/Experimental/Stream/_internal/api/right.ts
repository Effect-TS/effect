// ets_tracing: off

import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as MapError from "./mapError"
import * as RightOrFail from "./rightOrFail"

/**
 * Fails with the error `None` if value is `Left`.
 */
export function right<R, E, A1, A2>(
  self: C.Stream<R, E, E.Either<A1, A2>>
): C.Stream<R, O.Option<E>, A2> {
  return RightOrFail.rightOrFail_(MapError.mapError_(self, O.some), () => O.none)
}
