import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @tsplus static effect/core/stm/TSet.Aspects takeFirst
 * @tsplus pipeable effect/core/stm/TSet takeFirst
 */
export function takeFirst<A, B>(pf: (a: A) => Maybe<B>) {
  return (self: TSet<A>): STM<never, never, B> => {
    concreteTSet(self)
    return self.tmap.takeFirst((kv) => pf(kv[0]))
  }
}
