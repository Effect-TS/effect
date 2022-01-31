// ets_tracing: off

import * as E from "../../Either/index.js"
import * as O from "../../Option/index.js"
import type { Stream } from "./definitions.js"
import { mapError_ } from "./mapError.js"
import { rightOrFail_ } from "./rightOrFail.js"

/**
 * Fails with the error `None` if value is `Left`.
 */
export function right<R, E, O1, O2>(self: Stream<R, E, E.Either<O1, O2>>) {
  return rightOrFail_(mapError_(self, O.some), O.none)
}
