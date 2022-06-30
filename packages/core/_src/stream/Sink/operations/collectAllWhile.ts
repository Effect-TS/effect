/**
 * Accumulates incoming elements into a chunk as long as they verify predicate
 * `p`.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllWhile
 */
export function collectAllWhile<In>(
  p: Predicate<In>,
  __tsplusTrace?: string
): Sink<never, never, In, In, Chunk<In>> {
  return Sink.fold<In, Tuple<[List<In>, boolean]>>(
    Tuple(List.empty<In>(), true),
    (tuple) => tuple.get(1),
    ({ tuple: [as, _] }, a) => (p(a) ? Tuple(as.prepend(a), true) : Tuple(as, false))
  ).map(({ tuple: [inputs, _] }) => Chunk.from(inputs.reverse))
}
