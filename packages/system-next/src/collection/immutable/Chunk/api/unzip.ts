import { Tuple } from "../../Tuple"
import type { Chunk } from "../_definition"
import { append_, empty } from "../core"
import { forEach_ } from "./forEach"

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 */
export function unzip<A, B>(as: Chunk<Tuple<[A, B]>>): Tuple<[Chunk<A>, Chunk<B>]> {
  let fa: Chunk<A> = empty()
  let fb: Chunk<B> = empty()

  forEach_(as, ({ tuple: [a, b] }) => {
    fa = append_(fa, a)
    fb = append_(fb, b)
  })

  return Tuple(fa, fb)
}
