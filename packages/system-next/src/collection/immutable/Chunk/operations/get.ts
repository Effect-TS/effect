import { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Safely retrieve a value from a `Chunk`.
 *
 * @tsplus fluent ets/Chunk get
 */
export function get_<A>(self: Chunk<A>, n: number): Option<A> {
  return !Number.isInteger(n) || n < 0 || n >= concreteId(self).length
    ? Option.none
    : Option.some(concreteId(self)._get(n))
}

/**
 *  Safely retrieve a value from a `Chunk`.
 *
 * @ets_data_first get_
 */
export function get(n: number) {
  return <A>(self: Chunk<A>): Option<A> => self.get(n)
}
