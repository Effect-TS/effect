/**
 * Accumulates incoming elements into a chunk as long as they verify predicate
 * `p`.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllWhile
 */
export function collectAllWhile<In>(
  p: Predicate<In>
): Sink<never, never, In, In, Chunk<In>> {
  return Sink.fold<In, readonly [List<In>, boolean]>(
    [List.empty<In>(), true as boolean] as const,
    (tuple) => tuple[1],
    ([as, _], a) => (p(a) ? [as.prepend(a), true] as const : [as, false] as const)
  ).map(([inputs, _]) => Chunk.from(inputs.reverse))
}
