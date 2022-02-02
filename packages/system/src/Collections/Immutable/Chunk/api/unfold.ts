import * as O from "../../../../Option"
import type * as Tp from "../../Tuple"
import type { Chunk } from "../core"
import { append_, empty } from "../core"

/**
 * Constructs a `Chunk` by repeatedly applying the function `f` as long as it
 * returns `Some`.
 */
export function unfold<A, S>(s: S, f: (s: S) => O.Option<Tp.Tuple<[A, S]>>): Chunk<A> {
  let builder = empty<A>()
  let cont = true
  let s1 = s
  while (cont) {
    const x = f(s1)
    if (O.isSome(x)) {
      s1 = x[1]
      builder = append_(builder, x[0])
    } else {
      cont = false
    }
  }
  return builder
}
