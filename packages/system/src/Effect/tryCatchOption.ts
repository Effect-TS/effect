// ets_tracing: off

import * as E from "../Either/index.js"
import type * as O from "../Option/index.js"
import { fromEither } from "./fromEither.js"

/**
 * Get the A from an option
 */
export default function tryCatchOption_<A, E>(ma: O.Option<A>, onNone: () => E) {
  return fromEither(() => E.fromOption_(ma, onNone))
}

/**
 * Get the A from an option
 *
 * @ets_data_first tryCatchOption_
 */
export function tryCatchOption<A, E>(onNone: () => E) {
  return (ma: O.Option<A>) => tryCatchOption_(ma, onNone)
}
