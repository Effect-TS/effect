// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import type * as C from "../core.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Fails with given error 'e' if value is `Left`.
 */
export function rightOrFail_<R, E, E1, A1, A2>(
  self: C.Stream<R, E, E.Either<A1, A2>>,
  e: () => E1
): C.Stream<R, E | E1, A2> {
  return MapEffect.mapEffect_(
    self,
    E.fold(
      () => T.fail(e()),
      (_) => T.succeed(_)
    )
  )
}

/**
 * Fails with given error 'e' if value is `Left`.
 *
 * @ets_data_first rightOrFail_
 */
export function rightOrFail<E1>(e: () => E1) {
  return <R, E, A1, A2>(self: C.Stream<R, E, E.Either<A1, A2>>) => rightOrFail_(self, e)
}
