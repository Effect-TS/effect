import { List } from "../definition"
import { emptyAffix } from "./_internal/array"
import { ListInternal } from "./_internal/ListInternal"

/**
 * Takes two arguments and returns a list that contains them.
 *
 * @complexity O(1)
 * @ets static ets/ListOps pair
 */
export function pair_<A>(first: A, second: A): List<A> {
  return new ListInternal(2, 0, 2, emptyAffix, undefined, [first, second])
}

/**
 * Takes two arguments and returns a list that contains them.
 *
 * @complexity O(1)
 * @ets_data_first pair_
 */
export function pair<A>(second: A) {
  return (first: A): List<A> => List.pair(first, second)
}
