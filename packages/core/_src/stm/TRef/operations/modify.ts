import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects modify
 * @tsplus pipeable effect/core/stm/TRef modify
 */
export function modify<A, B>(f: (a: A) => Tuple<[B, A]>) {
  return (self: TRef<A>): STM<never, never, B> =>
    STM.Effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const {
        tuple: [retValue, newValue]
      } = entry.use((_) => f(_.unsafeGet<A>()))
      entry.use((_) => _.unsafeSet(newValue))
      return retValue
    })
}
