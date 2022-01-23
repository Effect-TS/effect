import * as E from "../../data/Either"
import type * as O from "../../data/Option"
import { fromEither } from "./fromEither"

/**
 * Get the A from an option
 */
export function tryCatchOption_<A, E>(ma: O.Option<A>, onNone: () => E) {
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
