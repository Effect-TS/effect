import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Accumulates incoming elements into a chunk as long as they verify effectful
 * predicate `p`.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllWhileEffect
 * @category constructors
 * @since 1.0.0
 */
export function collectAllWhileEffect<R, E, In>(
  p: (input: In) => Effect<R, E, boolean>
): Sink<R, E, In, In, Chunk.Chunk<In>> {
  return Sink.foldEffect<R, E, In, readonly [List.List<In>, boolean]>(
    [List.empty<In>(), true],
    (tuple) => tuple[1],
    ([list, _], a) =>
      p(a).map((b) => (b ?
        [pipe(list, List.prepend(a)), true] :
        [list, false])
      )
  ).map(([inputs, _]) => Chunk.fromIterable(List.reverse(inputs)))
}
