import type { Charset } from "@effect/core/stream/Stream/operations/_internal/Charset"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { stringChunkFrom } from "@effect/core/stream/Stream/operations/_internal/stringChunkFrom"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export function textDecodeUsing(charset: Charset) {
  return <R, E>(stream: Stream<R, E, number>): Stream<R, E, string> => {
    concreteStream(stream)
    return new StreamInternal(
      Channel.suspend(stream.channel >> transform<R, E>(charset))
    )
  }
}

function transform<R, E>(
  charset: Charset
): Channel<R, E, Chunk<number>, unknown, E, Chunk<string>, unknown> {
  return Channel.readWith(
    (received: Chunk<number>) =>
      received.length === 0
        ? transform(charset)
        : Channel.write(stringChunkFrom(received, charset)),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
