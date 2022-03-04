import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Find the last element in the array matching a transactional predicate.
 *
 * @tsplus fluent ets/TArray findLastSTM
 */
export function findLastSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, Option<A>> {
  concrete(self)
  const init = Tuple(Option.emptyOf<A>(), self.chunk.length - 1)
  const cont = (s: Tuple<[Option<A>, number]>) => s.get(0).isNone() && s.get(1) >= 0
  return STM.iterate(
    init,
    cont
  )((s) => {
    const index = s.get(1)
    return self.chunk
      .unsafeGet(index)!
      .get()
      .flatMap((a) =>
        f(a).map((result) => Tuple(result ? Option.some(a) : Option.none, index - 1))
      )
  }).map((tuple) => tuple.get(0))
}

/**
 * Find the last element in the array matching a transactional predicate.
 *
 * @ets_data_first findLastSTM_
 */
export function findLastSTM<E, A>(f: (a: A) => STM<unknown, E, boolean>) {
  return (self: TArray<A>): STM<unknown, E, Option<A>> => self.findLastSTM(f)
}
