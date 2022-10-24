import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * A sink that folds its input chunks with the provided function, termination
 * predicate and initial state. The `cont` condition is checked only for the
 * initial value and at the end of processing of each chunk. `f` and `cont`
 * must preserve chunking-invariance.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldChunksEffect
 * @category folding
 * @since 1.0.0
 */
export function foldChunksEffect<R, E, S, In>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, input: Chunk<In>) => Effect<R, E, S>
): Sink<R, E, In, never, S> {
  return Sink.suspend(new SinkInternal(reader(z, cont, f)))
}

function reader<R, E, S, In>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, input: Chunk<In>) => Effect<R, E, S>
): Channel<R, E, Chunk<In>, unknown, E, never, S> {
  return cont(z)
    ? Channel.readWith(
      (chunk: Chunk<In>) =>
        Channel.fromEffect(f(z, chunk)).flatMap((nextS) => reader<R, E, S, In>(nextS, cont, f)),
      (err) => Channel.fail(err),
      () => Channel.succeed(z)
    )
    : Channel.succeed(z)
}
