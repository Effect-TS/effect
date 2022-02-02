import * as Tp from "../../Tuple"
import { append_, empty } from "../core"
import type { Chunk } from "../definition"
import { forEach_ } from "./forEach"

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
