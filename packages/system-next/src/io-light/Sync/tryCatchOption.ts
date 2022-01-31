import { Either } from "../../data/Either"
import type { Option } from "../../data/Option"
import { fromEither } from "./fromEither"

/**
 * Get the A from an option
 */
export function tryCatchOption_<A, E>(ma: Option<A>, onNone: () => E) {
  return fromEither(() => Either.fromOption(ma, onNone))
}

/**
 * Get the A from an option
 *
 * @ets_data_first tryCatchOption_
 */
export function tryCatchOption<A, E>(onNone: () => E) {
  return (ma: Option<A>) => tryCatchOption_(ma, onNone)
}
