// ets_tracing: off

import * as E from "../../Either/index.js"
import { catchAll_ } from "./catchAll.js"
import type { Stream } from "./definitions.js"
import { map_ } from "./map.js"
import { succeed } from "./succeed.js"

/**
 * Returns a stream whose failures and successes have been lifted into an
 * `Either`. The resulting stream cannot fail, because the failures have
 * been exposed as part of the `Either` success case.
 *
 * @note the stream will end as soon as the first error occurs.
 */
export function either<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, never, E.Either<E, O>> {
  return catchAll_(
    map_(self, (o) => E.right(o)),
    (e) => succeed(E.left(e))
  )
}
