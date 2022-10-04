/**
 * Accumulates incoming elements into a chunk as long as they verify effectful
 * predicate `p`.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllWhileEffect
 */
export function collectAllWhileEffect<R, E, In>(
  p: (input: In) => Effect<R, E, boolean>
): Sink<R, E, In, In, Chunk<In>> {
  return Sink.foldEffect<R, E, In, readonly [List<In>, boolean]>(
    [List.empty<In>(), true as boolean] as const,
    (tuple) => tuple[1],
    ([as, _], a) => p(a).map((b) => (b ? [as.prepend(a), true] as const : [as, false] as const))
  ).map(([inputs, _]) => Chunk.from(inputs.reverse))
}
