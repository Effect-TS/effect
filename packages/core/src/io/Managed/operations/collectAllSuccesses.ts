import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Evaluate and run each effect in the structure and collect discarding failed
 * ones.
 *
 * @tsplus static ets/ManagedOps collectAllSuccesses
 */
export function collectAllSuccesses<R, E, A>(
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  __tsplusTrace?: string
) {
  return Managed.collectAllWith(
    Iter.map_(as(), (_) => _.exit()),
    (e) => (e._tag === "Success" ? Option.some(e.value) : Option.none)
  )
}
