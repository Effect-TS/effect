import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

type DecodingChannel<R, E> = Channel<
  R,
  E,
  Chunk.Chunk<number>,
  unknown,
  E,
  Chunk.Chunk<string>,
  unknown
>

/** @internal */
export function utfDecodeDetectingBom<R, E>(
  bomSize: number,
  processBom: (
    bom: Chunk.Chunk<number>
  ) => readonly [Chunk.Chunk<number>, (stream: Stream<R, E, number>) => Stream<R, E, string>]
) {
  return (stream: Stream<R, E, number>): Stream<R, E, string> => {
    concreteStream(stream)
    return new StreamInternal(
      Channel.suspend(
        stream.channel.pipeTo(lookingForBom<R, E>(Chunk.empty, bomSize, processBom))
      )
    )
  }
}

function passThrough<R, E>(
  decodingPipeline: (stream: Stream<R, E, number>) => Stream<R, E, string>
): DecodingChannel<R, E> {
  return Channel.readWith(
    (received: Chunk.Chunk<number>) => {
      const stream = decodingPipeline(Stream.fromChunk(received))
      concreteStream(stream)
      return stream.channel.flatMap(() => passThrough(decodingPipeline))
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}

function lookingForBom<R, E>(
  buffer: Chunk.Chunk<number>,
  bomSize: number,
  processBom: (
    bom: Chunk.Chunk<number>
  ) => readonly [Chunk.Chunk<number>, (stream: Stream<R, E, number>) => Stream<R, E, string>]
): DecodingChannel<R, E> {
  return Channel.readWith(
    (received: Chunk.Chunk<number>) => {
      const data = pipe(buffer, Chunk.concat(received))

      if (data.length >= bomSize) {
        const [bom, rest] = pipe(data, Chunk.splitAt(bomSize))
        const [dataWithoutBom, decodingPipeline] = processBom(bom)
        const stream = decodingPipeline(Stream.fromChunk(pipe(dataWithoutBom, Chunk.concat(rest))))
        concreteStream(stream)
        return stream.channel.flatMap(() => passThrough(decodingPipeline))
      }

      return lookingForBom(data, bomSize, processBom)
    },
    (err) => Channel.fail(err),
    () => {
      if (Chunk.isEmpty(buffer)) {
        return Channel.unit
      }
      const [dataWithoutBom, decodingPipeline] = processBom(buffer)
      const stream = decodingPipeline(Stream.fromChunk(dataWithoutBom))
      concreteStream(stream)
      return stream.channel.flatMap(() => passThrough(decodingPipeline))
    }
  )
}
