import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

const emptyByteChunk = Chunk.empty<number>()
const emptyStringChunk = Chunk.empty<string>()

export function utf8DecodeNoBom<R, E>(
  stream: Stream<R, E, number>,
  __tsplusTrace?: string
): Stream<R, E, string> {
  concreteStream(stream)
  return new StreamInternal(
    Channel.suspend(stream.channel >> readThenTransduce<R, E>(emptyByteChunk))
  )
}

function readThenTransduce<R, E>(
  buffer: Chunk<number>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<number>, unknown, E, Chunk<string>, unknown> {
  return Channel.readWith(
    (received: Chunk<number>) => {
      const {
        tuple: [string, buffered]
      } = process(buffer, received)
      return Channel.write(string) > readThenTransduce<R, E>(buffered)
    },
    (err) => Channel.fail(err),
    () => (buffer.isEmpty() ? Channel.unit : Channel.write(stringChunkFrom(buffer)))
  )
}

function process(
  buffered: Chunk<number>,
  received: Chunk<number>
): Tuple<[Chunk<string>, Chunk<number>]> {
  const bytes = buffered + received
  const {
    tuple: [chunk, rest]
  } = bytes.splitAt(computeSplitIndex(bytes))

  if (chunk.isEmpty()) {
    return Tuple(emptyStringChunk, rest.materialize())
  }
  if (rest.isEmpty()) {
    return Tuple(stringChunkFrom(chunk), emptyByteChunk)
  }
  return Tuple(stringChunkFrom(chunk), rest)
}

function stringChunkFrom(bytes: Chunk<number>): Chunk<string> {
  return Chunk.single(String.fromCharCode(...bytes))
}

function computeSplitIndex(chunk: Chunk<number>): number {
  // There are 3 bad patterns we need to check to detect an incomplete chunk:
  // - 2/3/4 byte sequences that start on the last byte
  // - 3/4 byte sequences that start on the second-to-last byte
  // - 4 byte sequences that start on the third-to-last byte
  //
  // Otherwise, we can convert the entire concatenated chunk to a string.
  const size = chunk.length

  if (
    size >= 1 &&
    List(is2ByteStart, is3ByteStart, is4ByteStart).find((f) => f(chunk.unsafeGet(size - 1))).isSome()
  ) {
    return size - 1
  }

  if (
    size >= 2 &&
    List(is3ByteStart, is4ByteStart).find((f) => f(chunk.unsafeGet(size - 2))).isSome()
  ) {
    return size - 2
  }

  if (size >= 3 && is4ByteStart(chunk.unsafeGet(size - 3))) {
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
