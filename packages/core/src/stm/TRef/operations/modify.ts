import type { Tuple } from "../../../collection/immutable/Tuple"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TRef } from "../definition"
import { getOrMakeEntry } from "./_internal/getOrMakeEntry"

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus fluent ets/TRef modify
 */
export function modify_<A, B>(self: TRef<A>, f: (a: A) => Tuple<[B, A]>): USTM<B> {
  return STM.Effect((journal) => {
    const entry = getOrMakeEntry(self, journal)
    const {
      tuple: [retValue, newValue]
    } = entry.use((_) => f(_.unsafeGet<A>()))
    entry.use((_) => _.unsafeSet(newValue))
    return retValue
  })
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 */
export const modify = Pipeable(modify_)
