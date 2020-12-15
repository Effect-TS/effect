import * as E from "../../Either"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { mapError_ } from "./mapError"
import { rightOrFail_ } from "./rightOrFail"

/**
 * Fails with the error `None` if value is `Left`.
 */
export function right<R, E, O1, O2>(self: Stream<R, E, E.Either<O1, O2>>) {
  return rightOrFail_(mapError_(self, O.some), O.none)
}
