// ets_tracing: off

import * as Tp from "../../Tuple/index.js"
import { append_, empty } from "../core.js"
import type { Chunk } from "../definition.js"
import { forEach_ } from "./forEach.js"

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 */
export function unzip<A, B>(
  as: Chunk<Tp.Tuple<[A, B]>>
): Tp.Tuple<[Chunk<A>, Chunk<B>]> {
  let fa: Chunk<A> = empty()
  let fb: Chunk<B> = empty()

  forEach_(as, ({ tuple: [a, b] }) => {
    fa = append_(fa, a)
    fb = append_(fb, b)
  })

  return Tp.tuple(fa, fb)
}
