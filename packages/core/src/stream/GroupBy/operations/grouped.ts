import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { Exit } from "../../../io/Exit"
import type { Dequeue } from "../../../io/Queue"
import type { Stream } from "../../Stream"
import type { GroupBy } from "../definition"
import { concreteGroupBy } from "./_internal/GroupByInternal"

/**
 * @tsplus fluent ets/GroupBy grouped
 */
export function grouped<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>,
  __tsplusTrace?: string
): Stream<R, E, Tuple<[K, Dequeue<Exit<Option<E>, V>>]>> {
  concreteGroupBy(self)
  return self.grouped()
}
