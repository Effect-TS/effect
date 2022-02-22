import { Tuple } from "../../Tuple"
import { Chunk } from "../definition"

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two
 * corresponding arrays.
 *
 * @tsplus fluent ets/Chunk unzip
 */
export function unzip<A, B>(as: Chunk<Tuple<[A, B]>>): Tuple<[Chunk<A>, Chunk<B>]> {
  let fa: Chunk<A> = Chunk.empty()
  let fb: Chunk<B> = Chunk.empty()

  as.forEach(({ tuple: [a, b] }) => {
    fa = fa.append(a)
    fb = fb.append(b)
  })

  return Tuple(fa, fb)
}
