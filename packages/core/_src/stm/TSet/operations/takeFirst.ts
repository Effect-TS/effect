import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @tsplus fluent ets/TSet takeFirst
 */
export function takeFirst_<A, B>(self: TSet<A>, pf: (a: A) => Maybe<B>): USTM<B> {
  concreteTSet(self)
  return self.tmap.takeFirst((kv) => pf(kv.get(0)))
}

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @tsplus static ets/TSet/Aspects takeFirst
 */
export const takeFirst = Pipeable(takeFirst_)
