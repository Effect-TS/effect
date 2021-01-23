import * as O from "../../Option"
import type { Stream } from "./definitions"
import { mapError_ } from "./mapError"
import { someOrFail_ } from "./someOrFail"

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, O2>(self: Stream<R, E, O.Option<O2>>) {
  return someOrFail_(mapError_(self, O.some), () => O.none)
}
