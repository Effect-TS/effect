import { Chunk } from "../../../collection/immutable/Chunk"
import { List } from "../../../collection/immutable/List"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Predicate } from "../../../data/Function"
import { Sink } from "../definition"

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate
 * `p`.
 *
 * @tsplus static ets/SinkOps collectAllWhile
 */
export function collectAllWhile<In>(
  p: Predicate<In>,
  __tsplusTrace?: string
): Sink<unknown, never, In, In, Chunk<In>> {
  return Sink.fold<In, Tuple<[List<In>, boolean]>>(
    Tuple(List.empty<In>(), true),
    (tuple) => tuple.get(1),
    ({ tuple: [as, _] }, a) => (p(a) ? Tuple(as.prepend(a), true) : Tuple(as, false))
  ).map(({ tuple: [inputs, _] }) => Chunk.from(inputs.reverse()))
}
