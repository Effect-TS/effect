// ets_tracing: off

import * as E from "../../../../Either/index.js"
import type * as C from "../core.js"
import * as CatchAll from "./catchAll.js"
import * as Map from "./map.js"
import * as Succeed from "./succeed.js"

/**
 * Returns a stream whose failures and successes have been lifted into an
 * `Either`. The resulting stream cannot fail, because the failures have
 * been exposed as part of the `Either` success case.
 *
 * @note the stream will end as soon as the first error occurs.
 */
export function either<R, E, A>(self: C.Stream<R, E, A>): C.RIO<R, E.Either<E, A>> {
  return CatchAll.catchAll_(Map.map_(self, E.right), (e) => Succeed.succeed(E.left(e)))
}
