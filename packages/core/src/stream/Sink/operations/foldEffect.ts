import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * A sink that effectfully folds its inputs with the provided function,
 * termination predicate and initial state.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldEffect
 * @category folding
 * @since 1.0.0
 */
export function foldEffect<R, E, In, S>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, input: In) => Effect<R, E, S>
): Sink<R, E, In, In, S> {
  return Sink.suspend(new SinkInternal(reader(z, cont, f)))
}

function reader<R, E, S, In>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, input: In) => Effect<R, E, S>
): Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, S> {
  if (!cont(z)) {
    return Channel.succeed(z)
  }
  return Channel.readWith(
    (chunk: Chunk.Chunk<In>) =>
      Channel.fromEffect(foldChunkSplitEffect(z, chunk, cont, f)).flatMap(
        ([nextS, leftovers]) => {
          switch (leftovers._tag) {
            case "None": {
              return reader(nextS, cont, f)
            }
            case "Some": {
              return Channel.write(leftovers.value).as(nextS)
            }
          }
        }
      ),
    (err) => Channel.fail(err),
    () => Channel.succeed(z)
  )
}

function foldChunkSplitEffect<R, E, S, In>(
  z: S,
  chunk: Chunk.Chunk<In>,
  cont: Predicate<S>,
  f: (s: S, input: In) => Effect<R, E, S>
): Effect<R, E, readonly [S, Option.Option<Chunk.Chunk<In>>]> {
  return foldEffectInternal(z, chunk, cont, f, 0, chunk.length)
}

function foldEffectInternal<R, E, S, In>(
  z: S,
  chunk: Chunk.Chunk<In>,
  cont: Predicate<S>,
  f: (s: S, input: In) => Effect<R, E, S>,
  index: number,
  length: number
): Effect<R, E, readonly [S, Option.Option<Chunk.Chunk<In>>]> {
  if (index === length) {
    return Effect.succeed([z, Option.none])
  }
  return f(z, pipe(chunk, Chunk.unsafeGet(index))).flatMap((z1) =>
    cont(z1)
      ? foldEffectInternal<R, E, S, In>(z1, chunk, cont, f, index + 1, length)
      : Effect.succeed([z1, Option.some(pipe(chunk, Chunk.drop(index + 1)))])
  )
}
