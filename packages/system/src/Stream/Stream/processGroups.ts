import type { GroupBy } from "../GroupBy/index"
import type { Stream } from "./definitions"

/**
 * Process the groups of a GroupBy
 */
export function processGroups<K, E, V, A, R1, E1>(
  f: (k: K, stream: Stream<unknown, E, V>) => Stream<R1, E1, A>
) {
  return <R>(self: GroupBy<R, E, K, V>): Stream<R & R1, E | E1, A> => self.process(f)
}
