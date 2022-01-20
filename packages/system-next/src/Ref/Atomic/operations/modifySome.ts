import type * as Tp from "../../../Collections/Immutable/Tuple"
import type * as O from "../../../Option"
import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function modifySome_<A, B>(
  self: Atomic<A>,
  def: B,
  f: (a: A) => O.Option<Tp.Tuple<[B, A]>>,
  __trace?: string
): T.UIO<B> {
  return T.succeed(() => {
    const v = self.value
    const o = f(v)

    if (o._tag === "Some") {
      self.value = o.value.get(1)
      return o.value.get(0)
    }

    return def
  }, __trace)
}

/**
 * @ets_data_first modifySome_
 */
export function modifySome<A, B>(
  def: B,
  f: (a: A) => O.Option<Tp.Tuple<[B, A]>>,
  __trace?: string
) {
  return (self: Atomic<A>): T.UIO<B> => modifySome_(self, def, f, __trace)
}
