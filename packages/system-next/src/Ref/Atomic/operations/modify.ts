import type * as Tp from "../../../Collections/Immutable/Tuple"
import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function modify_<A, B>(
  self: Atomic<A>,
  f: (a: A) => Tp.Tuple<[B, A]>,
  __trace?: string
): T.UIO<B> {
  return T.succeed(() => {
    const v = self.value
    const o = f(v)
    self.value = o.get(1)
    return o.get(0)
  }, __trace)
}

/**
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tp.Tuple<[B, A]>, __trace?: string) {
  return (self: Atomic<A>): T.UIO<B> => modify_(self, f, __trace)
}
