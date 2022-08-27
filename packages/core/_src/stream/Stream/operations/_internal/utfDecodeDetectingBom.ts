import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

type DecodingChannel<R, E> = Channel<
  R,
  E,
  Chunk<number>,
  unknown,
  E,
  Chunk<string>,
  unknown
>

export function utfDecodeDetectingBom<R, E>(
  bomSize: number,
  processBom: (
    bom: Chunk<number>
  ) => Tuple<[Chunk<number>, (stream: Stream<R, E, number>) => Stream<R, E, string>]>
) {
  return (stream: Stream<R, E, number>): Stream<R, E, string> => {
    concreteStream(stream)
    return new StreamInternal(
      Channel.suspend(
        stream.channel >>
          lookingForBom<R, E>(Chunk.empty<number>(), bomSize, processBom)
      )
    )
  }
}

function passThrough<R, E>(
  decodingPipeline: (stream: Stream<R, E, number>) => Stream<R, E, string>
): DecodingChannel<R, E> {
  return Channel.readWith(
    (received: Chunk<number>) => {
      const stream = decodingPipeline(Stream.fromChunk(received))
      concreteStream(stream)
      return stream.channel > passThrough(decodingPipeline)
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}

function lookingForBom<R, E>(
  buffer: Chunk<number>,
  bomSize: number,
  processBom: (
    bom: Chunk<number>
  ) => Tuple<[Chunk<number>, (stream: Stream<R, E, number>) => Stream<R, E, string>]>
): DecodingChannel<R, E> {
  return Channel.readWith(
    (received: Chunk<number>) => {
      const data = buffer + received

      if (data.length >= bomSize) {
        const {
          tuple: [bom, rest]
        } = data.splitAt(bomSize)
        const {
          tuple: [dataWithoutBom, decodingPipeline]
        } = processBom(bom)
        const stream = decodingPipeline(Stream.fromChunk(dataWithoutBom + rest))
        concreteStream(stream)
        return stream.channel > passThrough(decodingPipeline)
      }

      return lookingForBom(data, bomSize, processBom)
    },
    (err) => Channel.fail(err),
    () => {
      if (buffer.isEmpty) {
        return Channel.unit
      }
      const {
        tuple: [dataWithoutBom, decodingPipeline]
      } = processBom(buffer)
      const stream = decodingPipeline(Stream.fromChunk(dataWithoutBom))
      concreteStream(stream)
      return stream.channel > passThrough(decodingPipeline)
    }
  )
}
