import type { Next } from "../../../collection/immutable/Map"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Atomically updates all elements using a transactional effect.
 *
 * @tsplus fluent ets/TArray transformSTM
 */
export function transformSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, A>
): STM<unknown, E, void> {
  concrete(self)
  return STM.forEach(self.chunk, (tref) => tref.get().flatMap(f)).flatMap((newData) =>
    STM.Effect((journal) => {
      let i = 0
      const iterator = newData[Symbol.iterator]()
      let next: Next<A>
      while (!(next = iterator.next()).done) {
        self.chunk.unsafeGet(i)!.unsafeSet(next.value, journal)
        i = i + 1
      }
    })
  )
}

/**
 * Atomically updates all elements using a transactional effect.
 *
 * @ets_data_first transformSTM_
 */
export function transformSTM<E, A>(f: (a: A) => STM<unknown, E, A>) {
  return (self: TArray<A>): STM<unknown, E, void> => self.transformSTM(f)
}
