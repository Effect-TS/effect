import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Takes the first `n` elements.
 *
 * @tsplus fluent ets/Chunk take
 */
export function take_<A>(self: Chunk<A>, n: number): Chunk<A> {
  return concreteId(self)._take(n)
}

/**
 * Takes the first `n` elements.
 *
 * @ets_data_first take_
 */
export function take(n: number) {
  return <A>(self: Chunk<A>): Chunk<A> => self.take(n)
}
