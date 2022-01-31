// ets_tracing: off

import * as E from "../../Either/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { mapM_ } from "./mapM.js"

/**
 * Fails with given error 'e' if value is `Left`.
 */
export function rightOrFail_<R, E, E1, O1, O2>(
  self: Stream<R, E, E.Either<O1, O2>>,
  e: E1
): Stream<R, E | E1, O2> {
  return mapM_(
    self,
    E.fold(
      (_) => T.fail(e),
      (_) => T.succeed(_)
    )
  )
}

/**
 * Fails with given error 'e' if value is `Left`.
 */
export function rightOrFail<E1>(e: E1) {
  return <R, E, O1, O2>(self: Stream<R, E, E.Either<O1, O2>>) => rightOrFail_(self, e)
}
