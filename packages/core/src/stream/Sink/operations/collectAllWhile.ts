import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate
 * `p`.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllWhile
 * @category constructors
 * @since 1.0.0
 */
export function collectAllWhile<In>(
  p: Predicate<In>
): Sink<never, never, In, In, Chunk.Chunk<In>> {
  return Sink.fold<In, readonly [List.List<In>, boolean]>(
    [List.empty<In>(), true],
    (tuple) => tuple[1],
    ([list, _], a) => (p(a) ?
      [pipe(list, List.prepend(a)), true] :
      [list, false])
  ).map(([inputs, _]) => Chunk.fromIterable(List.reverse(inputs)))
}
