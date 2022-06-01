import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus static ets/Sink/Ops collectAll
 */
export function collectAll<In>(
  __tsplusTrace?: string
): Sink<never, never, In, never, Chunk<In>> {
  return new SinkInternal(loop(Chunk.empty()))
}

function loop<In>(
  acc: Chunk<In>
): Channel<never, never, Chunk<In>, unknown, never, never, Chunk<In>> {
  return Channel.readWithCause(
    (chunk: Chunk<In>) => loop<In>(acc + chunk),
    (cause) => Channel.failCause(cause),
    () => Channel.succeed(acc)
  )
}
