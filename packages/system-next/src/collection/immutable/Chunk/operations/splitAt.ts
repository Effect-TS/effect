import { Tuple } from "../../Tuple"
import type { Chunk } from "../definition"

/**
 * Returns two splits of this chunk at the specified index.
 *
 * @tsplus fluent ets/Chunk splitAt
 */
export function splitAt_<A>(self: Chunk<A>, n: number): Tuple<[Chunk<A>, Chunk<A>]> {
  return Tuple(self.take(n), self.drop(n))
}

/**
 * Returns two splits of this chunk at the specified index.
 *
 * @ets_data_first splitAt_
 */
export function splitAt(n: number) {
  return <A>(self: Chunk<A>): Tuple<[Chunk<A>, Chunk<A>]> => self.splitAt(n)
}
