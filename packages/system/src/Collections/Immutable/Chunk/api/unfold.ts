// ets_tracing: off

import * as O from "../../../../Option/index.js"
import type * as Tp from "../../Tuple/index.js"
import type { Chunk } from "../core.js"
import { append_, empty } from "../core.js"

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
