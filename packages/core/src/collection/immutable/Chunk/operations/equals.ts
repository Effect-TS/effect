import * as St from "../../../../prelude/Structural"
import type { Chunk } from "../definition"

/**
 * Referential equality check.
 *
 * @tsplus fluent ets/Chunk equals
 */
export function equals_<A, B>(self: Chunk<A>, that: Chunk<B>): boolean {
  return self.corresponds(that, St.equals)
}

/**
 * Referential equality check
 *
 * @ets_data_first equals_
 */
export function equals<B>(that: Chunk<B>) {
  return <A>(self: Chunk<A>): boolean => self.equals(that)
}
