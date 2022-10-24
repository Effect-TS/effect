import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

const emptyByteChunk: Chunk.Chunk<number> = Chunk.empty
const emptyStringChunk: Chunk.Chunk<string> = Chunk.empty

/** @internal */
export function utf8DecodeNoBom<R, E>(
  stream: Stream<R, E, number>
): Stream<R, E, string> {
  concreteStream(stream)
  return new StreamInternal(
    Channel.suspend(stream.channel >> readThenTransduce<R, E>(emptyByteChunk))
  )
}

function readThenTransduce<R, E>(
  buffer: Chunk.Chunk<number>
): Channel<R, E, Chunk.Chunk<number>, unknown, E, Chunk.Chunk<string>, unknown> {
  return Channel.readWith(
    (received: Chunk.Chunk<number>) => {
      const [string, buffered] = process(buffer, received)
      return Channel.write(string).flatMap(() => readThenTransduce<R, E>(buffered))
    },
    (err) => Channel.fail(err),
    () => (Chunk.isEmpty(buffer) ? Channel.unit : Channel.write(stringChunkFrom(buffer)))
  )
}

function process(
  buffered: Chunk.Chunk<number>,
  received: Chunk.Chunk<number>
): readonly [Chunk.Chunk<string>, Chunk.Chunk<number>] {
  const bytes = pipe(buffered, Chunk.concat(received))
  const [chunk, rest] = pipe(bytes, Chunk.splitAt(computeSplitIndex(bytes)))

  if (Chunk.isEmpty(chunk)) {
    return [emptyStringChunk, rest]
  }
  if (Chunk.isEmpty(rest)) {
    return [stringChunkFrom(chunk), emptyByteChunk]
  }
  return [stringChunkFrom(chunk), rest]
}

function stringChunkFrom(bytes: Chunk.Chunk<number>): Chunk.Chunk<string> {
  return Chunk.single(String.fromCharCode(...bytes))
}

function computeSplitIndex(chunk: Chunk.Chunk<number>): number {
  // There are 3 bad patterns we need to check to detect an incomplete chunk:
  // - 2/3/4 byte sequences that start on the last byte
  // - 3/4 byte sequences that start on the second-to-last byte
  // - 4 byte sequences that start on the third-to-last byte
  //
  // Otherwise, we can convert the entire concatenated chunk to a string.
  const size = chunk.length

  if (
    size >= 1 &&
    pipe(
      List.make(is2ByteStart, is3ByteStart, is4ByteStart),
      List.findFirst((f) => f(pipe(chunk, Chunk.unsafeGet(size - 1)))),
      Option.isSome
    )
  ) {
    return size - 1
  }

  if (
    size >= 2 &&
    pipe(
      List.make(is3ByteStart, is4ByteStart),
      List.findFirst((f) => f(pipe(chunk, Chunk.unsafeGet(size - 2)))),
      Option.isSome
    )
  ) {
    return size - 2
  }

  if (size >= 3 && is4ByteStart(pipe(chunk, Chunk.unsafeGet(size - 3)))) {
    return size - 3
  }

  return size
}

function is2ByteStart(byte: number): boolean {
  return (byte & 0xe0) === 0xc0
}

function is3ByteStart(byte: number): boolean {
  return (byte & 0xf0) === 0xe0
}

function is4ByteStart(byte: number): boolean {
  return (byte & 0xf8) === 0xf0
}
