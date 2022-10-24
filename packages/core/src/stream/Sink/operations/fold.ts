import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * A sink that folds its inputs with the provided function, termination
 * predicate and initial state.
 *
 * @tsplus static effect/core/stream/Sink.Ops fold
 * @category folding
 * @since 1.0.0
 */
export function fold<In, S>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, input: In) => S
): Sink<never, never, In, In, S> {
  return Sink.suspend(new SinkInternal(reader(z, cont, f)))
}

function reader<S, In>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, input: In) => S
): Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, S> {
  return !cont(z)
    ? Channel.succeed(z)
    : Channel.readWith(
      (chunk: Chunk.Chunk<In>) => {
        const [nextS, leftovers] = foldChunkSplit(z, chunk, cont, f)
        return leftovers.length > 0
          ? Channel.write(leftovers).as(nextS)
          : reader<S, In>(nextS, cont, f)
      },
      (err) => Channel.fail(err),
      () => Channel.succeed(z)
    )
}

function foldChunkSplit<S, In>(
  z: S,
  chunk: Chunk.Chunk<In>,
  cont: Predicate<S>,
  f: (s: S, input: In) => S
): readonly [S, Chunk.Chunk<In>] {
  return foldInternal(z, chunk, cont, f, 0, chunk.length)
}

function foldInternal<S, In>(
  z: S,
  chunk: Chunk.Chunk<In>,
  cont: Predicate<S>,
  f: (s: S, input: In) => S,
  index: number,
  length: number
): readonly [S, Chunk.Chunk<In>] {
  if (index === length) {
    return [z, Chunk.empty]
  }
  const z1 = f(z, pipe(chunk, Chunk.unsafeGet(index)))
  return cont(z1)
    ? foldInternal<S, In>(z1, chunk, cont, f, index + 1, length)
    : [z1, pipe(chunk, Chunk.drop(index + 1))]
}
