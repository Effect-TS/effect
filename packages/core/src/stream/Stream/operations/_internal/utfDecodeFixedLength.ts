import type { Charset } from "@effect/core/stream/Stream/operations/_internal/Charset"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { stringChunkFrom } from "@effect/core/stream/Stream/operations/_internal/stringChunkFrom"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

const emptyByteChunk: Chunk.Chunk<number> = Chunk.empty
const emptyStringChunk: Chunk.Chunk<string> = Chunk.empty

/** @internal */
export function utfDecodeFixedLength(
  charset: Charset,
  fixedLength: number
) {
  return <R, E>(stream: Stream<R, E, number>): Stream<R, E, string> => {
    concreteStream(stream)
    return new StreamInternal(
      Channel.suspend(
        stream.channel >> readThenTransduce<R, E>(emptyByteChunk, charset, fixedLength)
      )
    )
  }
}

function readThenTransduce<R, E>(
  buffer: Chunk.Chunk<number>,
  charset: Charset,
  fixedLength: number
): Channel<R, E, Chunk.Chunk<number>, unknown, E, Chunk.Chunk<string>, unknown> {
  return Channel.readWith(
    (received: Chunk.Chunk<number>) => {
      const [string, buffered] = process(buffer, received, charset, fixedLength)
      return (
        Channel.write(string).flatMap(() => readThenTransduce<R, E>(buffered, charset, fixedLength))
      )
    },
    (err) => Channel.fail(err),
    () => Chunk.isEmpty(buffer) ? Channel.unit : Channel.write(stringChunkFrom(buffer, charset))
  )
}

function process(
  buffered: Chunk.Chunk<number>,
  received: Chunk.Chunk<number>,
  charset: Charset,
  fixedLength: number
): readonly [Chunk.Chunk<string>, Chunk.Chunk<number>] {
  const bytes = pipe(buffered, Chunk.concat(received))
  const remainder = bytes.length % fixedLength

  if (remainder === 0) {
    return [stringChunkFrom(bytes, charset), emptyByteChunk]
  }
  if (bytes.length > fixedLength) {
    const [fullChunk, rest] = pipe(bytes, Chunk.splitAt(bytes.length - remainder))
    return [stringChunkFrom(fullChunk, charset), rest]
  }
  return [emptyStringChunk, bytes]
}
