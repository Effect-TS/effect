// ets_tracing: off

import * as O from "../../Option/index.js"
import type { Stream } from "./definitions.js"
import { mapError_ } from "./mapError.js"
import { someOrFail_ } from "./someOrFail.js"

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, O2>(self: Stream<R, E, O.Option<O2>>) {
  return someOrFail_(mapError_(self, O.some), () => O.none)
}
