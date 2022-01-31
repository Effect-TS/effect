import type { Tuple } from "../../../../collection/immutable/Tuple"
import { Effect } from "../../../Effect"
import type { Atomic } from "../Atomic"

export function modify_<A, B>(
  self: Atomic<A>,
  f: (a: A) => Tuple<[B, A]>,
  __etsTrace?: string
): Effect<unknown, never, B> {
  return Effect.succeed(() => {
    const v = self.value.get
    const o = f(v)
    self.value.set(o.get(1))
    return o.get(0)
  })
}

/**
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tuple<[B, A]>, __etsTrace?: string) {
  return (self: Atomic<A>): Effect<unknown, never, B> => modify_(self, f)
}
