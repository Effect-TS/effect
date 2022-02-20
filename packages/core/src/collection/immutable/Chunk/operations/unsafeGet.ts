import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Unsafely retrieve a value from a `Chunk`.
 *
 * @tsplus fluent ets/Chunk unsafeGet
 */
export function unsafeGet_<A>(self: Chunk<A>, n: number): A {
  return concreteId(self)._get(n)
}

/**
 * Unsafely retrieve a value from a `Chunk`.
 *
 * @ets_data_first unsafeGet_
 */
export function unsafeGet(n: number) {
  return <A>(self: Chunk<A>): A => self.unsafeGet(n)
}
