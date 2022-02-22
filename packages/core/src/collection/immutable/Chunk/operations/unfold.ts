import type { Option } from "../../../../data/Option"
import type { Tuple } from "../../Tuple"
import { Chunk } from "../definition"

/**
 * Constructs a `Chunk` by repeatedly applying the function `f` as long as it
 * returns `Some`.
 *
 * @tsplus static ets/ChunkOps unfold
 */
export function unfold<A, S>(s: S, f: (s: S) => Option<Tuple<[A, S]>>): Chunk<A> {
  let builder = Chunk.empty<A>()
  let cont = true
  let s1 = s
  while (cont) {
    const x = f(s1)
    if (x.isSome()) {
      s1 = x[1]
      builder = builder.append(x[0])
    } else {
      cont = false
    }
  }
  return builder
}
