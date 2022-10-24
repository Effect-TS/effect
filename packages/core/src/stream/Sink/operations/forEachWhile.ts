import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * A sink that executes the provided effectful function for every element fed
 * to it until `f` evaluates to `false`.
 *
 * @tsplus static effect/core/stream/Sink.Ops forEachWhile
 */
export function forEachWhile<R, E, In>(
  f: (input: In) => Effect<R, E, boolean>
): Sink<R, E, In, In, void> {
  const process: Channel<
    R,
    E,
    Chunk.Chunk<In>,
    unknown,
    E,
    Chunk.Chunk<In>,
    void
  > = Channel.readWithCause(
    (input: Chunk.Chunk<In>) => go(f, input, 0, input.length, process),
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
  return new SinkInternal(process)
}

function go<R, E, In>(
  f: (input: In) => Effect<R, E, boolean>,
  chunk: Chunk.Chunk<In>,
  index: number,
  length: number,
  cont: Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, void>
): Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, void> {
  return index === length
    ? cont
    : Channel.fromEffect(f(pipe(chunk, Chunk.unsafeGet(index))))
      .flatMap((b) =>
        b ?
          go(f, chunk, index + 1, length, cont) :
          Channel.write(pipe(chunk, Chunk.drop(index)))
      )
      .catchAll((e) => Channel.write(pipe(chunk, Chunk.drop(index))).flatMap(() => Channel.fail(e)))
}
