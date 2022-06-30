import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Splits elements on a delimiter and transforms the splits into desired
 * output, flattening the resulting chunks into the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects splitOnChunkFlatten
 * @tsplus pipeable effect/core/stream/Stream splitOnChunkFlatten
 */
export function splitOnChunkFlatten<A>(
  delimiter: LazyArg<Chunk<A>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return Stream.succeed(delimiter).flatMap(
      (delimiter) => new StreamInternal(self.channel >> next<R, E, A>(delimiter, Maybe.none, 0))
    )
  }
}

function next<R, E, A>(
  delimiter: Chunk<A>,
  leftover: Maybe<Chunk<A>>,
  delimiterIndex: number,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWithCause(
    (inputChunk: Chunk<A>) => {
      const buffer = Chunk.builder<Chunk<A>>()

      const {
        tuple: [carry, delimiterCursor]
      } = inputChunk.reduce(
        Tuple(leftover.getOrElse(Chunk.empty<A>()), delimiterIndex),
        ({ tuple: [carry, delimiterCursor] }, a) => {
          const concatenated = carry.append(a)
          if (
            delimiterCursor < delimiter.length &&
            a === delimiter.unsafeGet(delimiterCursor)
          ) {
            if (delimiterCursor + 1 === delimiter.length) {
              buffer.append(concatenated.take(concatenated.length - delimiter.length))
              return Tuple(Chunk.empty<A>(), 0)
            }
            return Tuple(concatenated, delimiterCursor + 1)
          }
          return Tuple(concatenated, a === delimiter.unsafeHead ? 1 : 0)
        }
      )

      return (
        Channel.writeChunk(buffer.build()) >
          next<R, E, A>(
            delimiter,
            carry.isNonEmpty ? Maybe.some(carry) : Maybe.none,
            delimiterCursor
          )
      )
    },
    (cause) =>
      leftover.fold(
        Channel.failCause(cause),
        (chunk) => Channel.write(chunk) > Channel.failCause(cause)
      ),
    (done) =>
      leftover.fold(
        Channel.succeed(done),
        (chunk) => Channel.write(chunk) > Channel.succeed(done)
      )
  )
}
