import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Splits elements on a delimiter and transforms the splits into desired
 * output, flattening the resulting chunks into the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects splitOnChunkFlatten
 * @tsplus pipeable effect/core/stream/Stream splitOnChunkFlatten
 * @category mutations
 * @since 1.0.0
 */
export function splitOnChunkFlatten<A>(delimiter: Chunk.Chunk<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> next<R, E, A>(delimiter, Option.none, 0))
  }
}

function next<R, E, A>(
  delimiter: Chunk.Chunk<A>,
  leftover: Option.Option<Chunk.Chunk<A>>,
  delimiterIndex: number
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> {
  return Channel.readWithCause(
    (inputChunk: Chunk.Chunk<A>) => {
      const buffer: Array<Chunk.Chunk<A>> = []

      const [carry, delimiterCursor] = pipe(
        inputChunk,
        Chunk.reduce(
          [Option.isSome(leftover) ? leftover.value : Chunk.empty, delimiterIndex] as const,
          ([carry, delimiterCursor], a) => {
            const concatenated = pipe(carry, Chunk.append(a))
            if (
              delimiterCursor < delimiter.length &&
              a === pipe(delimiter, Chunk.unsafeGet(delimiterCursor))
            ) {
              if (delimiterCursor + 1 === delimiter.length) {
                buffer.push(pipe(concatenated, Chunk.take(concatenated.length - delimiter.length)))
                return [Chunk.empty, 0]
              }
              return [concatenated, delimiterCursor + 1]
            }
            return [concatenated, a === Chunk.unsafeHead(delimiter) ? 1 : 0]
          }
        )
      )

      return Channel.writeChunk(Chunk.unsafeFromArray(buffer)).flatMap(() =>
        next<R, E, A>(
          delimiter,
          Chunk.isNonEmpty(carry) ? Option.some(carry) : Option.none,
          delimiterCursor
        )
      )
    },
    (cause) => {
      switch (leftover._tag) {
        case "None": {
          return Channel.failCause(cause)
        }
        case "Some": {
          return Channel.write(leftover.value).flatMap(() => Channel.failCause(cause))
        }
      }
    },
    (done) => {
      switch (leftover._tag) {
        case "None": {
          return Channel.succeed(done)
        }
        case "Some": {
          return Channel.write(leftover.value).flatMap(() => Channel.succeed(done))
        }
      }
    }
  )
}
