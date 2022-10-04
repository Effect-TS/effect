import type { Charset } from "@effect/core/stream/Stream/operations/_internal/Charset"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { stringChunkFrom } from "@effect/core/stream/Stream/operations/_internal/stringChunkFrom"

const emptyByteChunk = Chunk.empty<number>()
const emptyStringChunk = Chunk.empty<string>()

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
  buffer: Chunk<number>,
  charset: Charset,
  fixedLength: number
): Channel<R, E, Chunk<number>, unknown, E, Chunk<string>, unknown> {
  return Channel.readWith(
    (received: Chunk<number>) => {
      const [string, buffered] = process(buffer, received, charset, fixedLength)
      return (
        Channel.write(string).flatMap(() => readThenTransduce<R, E>(buffered, charset, fixedLength))
      )
    },
    (err) => Channel.fail(err),
    () => buffer.isEmpty ? Channel.unit : Channel.write(stringChunkFrom(buffer, charset))
  )
}

function process(
  buffered: Chunk<number>,
  received: Chunk<number>,
  charset: Charset,
  fixedLength: number
): readonly [Chunk<string>, Chunk<number>] {
  const bytes = buffered + received
  const remainder = bytes.length % fixedLength

  if (remainder === 0) {
    return [stringChunkFrom(bytes, charset), emptyByteChunk]
  }
  if (bytes.length > fixedLength) {
    const [fullChunk, rest] = bytes.splitAt(bytes.length - remainder)
    return [stringChunkFrom(fullChunk, charset), rest]
  }
  return [emptyStringChunk, bytes.materialize]
}
