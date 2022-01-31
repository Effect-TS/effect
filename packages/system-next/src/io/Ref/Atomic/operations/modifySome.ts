import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { Atomic } from "../Atomic"

export function modifySome_<A, B>(
  self: Atomic<A>,
  def: B,
  f: (a: A) => Option<Tuple<[B, A]>>,
  __etsTrace?: string
): Effect<unknown, never, B> {
  return Effect.succeed(() => {
    const v = self.value.get
    const o = f(v)

    if (o._tag === "Some") {
      self.value.set(o.value.get(1))
      return o.value.get(0)
    }

    return def
  })
}

/**
 * @ets_data_first modifySome_
 */
export function modifySome<A, B>(
  def: B,
  f: (a: A) => Option<Tuple<[B, A]>>,
  __etsTrace?: string
) {
  return (self: Atomic<A>): Effect<unknown, never, B> => modifySome_(self, def, f)
}
