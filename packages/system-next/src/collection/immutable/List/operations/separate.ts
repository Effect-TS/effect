import type { Either } from "../../../../data/Either"
import { identity } from "../../../../data/Function"
import type { Tuple } from "../../Tuple"
import type { List } from "../definition"

/**
 * Splits the list into two lists. One list that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 * @ets fluent ets/List separate
 */
export function separate<B, C>(self: List<Either<B, C>>): Tuple<[List<B>, List<C>]> {
  return self.partitionMap(identity)
}
