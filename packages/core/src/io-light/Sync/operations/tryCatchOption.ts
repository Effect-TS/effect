import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Sync } from "../definition"

/**
 * Get the `A` from an option.
 *
 * @tsplus static ets/SyncOps tryCatchOption
 */
export function tryCatchOption_<A, E>(option: Option<A>, onNone: LazyArg<E>) {
  return Sync.fromEither(Either.fromOption(option, onNone))
}

/**
 * Get the `A` from an option.
 *
 * @ets_data_first tryCatchOption_
 */
export function tryCatchOption<A, E>(onNone: LazyArg<E>) {
  return (option: Option<A>) => Sync.tryCatchOption(option, onNone)
}
