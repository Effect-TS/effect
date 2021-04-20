import { append_, empty } from "../core"
import type { Chunk } from "../definition"
import { forEach_ } from "./forEach"

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 */
export function unzip<A, B>(as: Chunk<readonly [A, B]>): readonly [Chunk<A>, Chunk<B>] {
  let fa: Chunk<A> = empty()
  let fb: Chunk<B> = empty()

  forEach_(as, ([a, b]) => {
    fa = append_(fa, a)
    fb = append_(fb, b)
  })

  return [fa, fb]
}
