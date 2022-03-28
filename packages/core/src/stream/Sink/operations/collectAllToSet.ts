import { HashSet } from "../../../collection/immutable/HashSet"
import { Sink } from "../definition"

/**
 * A sink that collects all of its inputs into a set.
 *
 * @tsplus static ets/SinkOps collectAllToSet
 */
export function collectAllToSet<In>(): Sink<unknown, never, In, never, HashSet<In>> {
  return Sink.foldLeftChunks(HashSet.empty(), (acc, as) =>
    as.reduce(acc, (set, a) => set.add(a))
  )
}
