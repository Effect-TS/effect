/**
 * Accumulates incoming elements into a chunk as long as they verify effectful
 * predicate `p`.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllWhileEffect
 */
export function collectAllWhileEffect<R, E, In>(
  p: (input: In) => Effect<R, E, boolean>
): Sink<R, E, In, In, Chunk<In>> {
  return Sink.foldEffect<R, E, In, Tuple<[List<In>, boolean]>>(
    Tuple(List.empty<In>(), true),
    (tuple) => tuple.get(1),
    ({ tuple: [as, _] }, a) => p(a).map((b) => (b ? Tuple(as.prepend(a), true) : Tuple(as, false)))
  ).map(({ tuple: [inputs, _] }) => Chunk.from(inputs.reverse))
}
