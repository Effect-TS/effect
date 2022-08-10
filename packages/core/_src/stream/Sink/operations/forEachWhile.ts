import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

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
    Chunk<In>,
    unknown,
    E,
    Chunk<In>,
    void
  > = Channel.readWithCause(
    (input: Chunk<In>) => go(f, input, 0, input.length, process),
    (cause) => Channel.failCauseSync(cause),
    () => Channel.unit
  )
  return new SinkInternal(process)
}

function go<R, E, In>(
  f: (input: In) => Effect<R, E, boolean>,
  chunk: Chunk<In>,
  index: number,
  length: number,
  cont: Channel<R, E, Chunk<In>, unknown, E, Chunk<In>, void>
): Channel<R, E, Chunk<In>, unknown, E, Chunk<In>, void> {
  return index === length
    ? cont
    : Channel.fromEffect(f(chunk.unsafeGet(index)))
      .flatMap((b) => b ? go(f, chunk, index + 1, length, cont) : Channel.write(chunk.drop(index)))
      .catchAll((e) => Channel.write(chunk.drop(index)) > Channel.failSync(e))
}
