import type { Chunk } from "../definition"

/**
 * Drops the last `n` elements.
 *
 * @tsplus fluent ets/Chunk dropRight
 */
export function dropRight_<A>(self: Chunk<A>, n: number) {
  return self.take(Math.max(0, self.length - n))
}

/**
 * Drops the last `n` elements.
 *
 * @ets_data_first dropRight_
 */
export function dropRight(n: number) {
  return <A>(self: Chunk<A>) => self.dropRight(n)
}
