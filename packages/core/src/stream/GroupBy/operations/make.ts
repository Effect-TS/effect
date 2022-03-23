import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Effect } from "../../../io/Effect"
import type { Stream } from "../../Stream"
import type { GroupBy } from "../definition"
import { GroupByInternal } from "./_internal/GroupByInternal"

/**
 * Constructs a new `GroupBy`.
 *
 * @tsplus static ets/GroupByOps __call
 */
export function make<R, E, R2, E2, K, V, A>(
  stream: Stream<R, E, A>,
  key: (a: A) => Effect<R2, E2, Tuple<[K, V]>>,
  buffer: number
): GroupBy<R & R2, E | E2, K, V, A> {
  return new GroupByInternal<R & R2, E | E2, K, V, A>(stream, key, buffer)
}
