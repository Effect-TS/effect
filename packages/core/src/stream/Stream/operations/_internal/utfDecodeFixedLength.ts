import { Chunk } from "../../../../collection/immutable/Chunk"
import { Tuple } from "../../../../collection/immutable/Tuple"
import { Channel } from "../../../Channel"
import type { Stream } from "../../definition"
import type { Charset } from "./Charset"
import { concreteStream, StreamInternal } from "./StreamInternal"
import { stringChunkFrom } from "./stringChunkFrom"

const emptyByteChunk = Chunk.empty<number>()
const emptyStringChunk = Chunk.empty<string>()

export function utfDecodeFixedLength(
  charset: Charset,
  fixedLength: number,
  __tsplusTrace?: string
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
  fixedLength: number,
  __tsplusTrace?: string
): Channel<R, E, Chunk<number>, unknown, E, Chunk<string>, unknown> {
  return Channel.readWith(
    (received: Chunk<number>) => {
      const {
        tuple: [string, buffered]
      } = process(buffer, received, charset, fixedLength)
      return (
        Channel.write(string) > readThenTransduce<R, E>(buffered, charset, fixedLength)
      )
    },
    (err) => Channel.fail(err),
    () =>
      buffer.isEmpty() ? Channel.unit : Channel.write(stringChunkFrom(buffer, charset))
  )
}

function process(
  buffered: Chunk<number>,
  received: Chunk<number>,
  charset: Charset,
  fixedLength: number
): Tuple<[Chunk<string>, Chunk<number>]> {
  const bytes = buffered + received
  const remainder = bytes.length % fixedLength

  if (remainder === 0) {
    return Tuple(stringChunkFrom(bytes, charset), emptyByteChunk)
  }
  if (bytes.length > fixedLength) {
    const {
      tuple: [fullChunk, rest]
    } = bytes.splitAt(bytes.length - remainder)
    return Tuple(stringChunkFrom(fullChunk, charset), rest)
  }
  return Tuple(emptyStringChunk, bytes.materialize())
}
