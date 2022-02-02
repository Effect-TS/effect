import type { Chunk } from "../definition"

/**
 * Takes the last `n` elements.
 *
 * @tsplus fluent ets/Chunk takeRight
 */
export function takeRight_<A>(self: Chunk<A>, n: number): Chunk<A> {
  return self.drop(self.size - n)
}

/**
 * Takes the last `n` elements.
 *
 * @ets_data_first takeRight_
 */
export function takeRight(n: number) {
  return <A>(self: Chunk<A>) => self.takeRight(n)
}
