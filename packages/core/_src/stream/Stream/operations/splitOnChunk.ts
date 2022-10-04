import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Splits elements on a delimiter and transforms the splits into desired
 * output.
 *
 * @tsplus static effect/core/stream/Stream.Aspects splitOnChunk
 * @tsplus pipeable effect/core/stream/Stream splitOnChunk
 */
export function splitOnChunk<A>(delimiter: Chunk<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, Chunk<A>> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> next<R, E, A>(delimiter, Maybe.none, 0))
  }
}

function next<R, E, A>(
  delimiter: Chunk<A>,
  leftover: Maybe<Chunk<A>>,
  delimiterIndex: number
): Channel<R, E, Chunk<A>, unknown, E, Chunk<Chunk<A>>, unknown> {
  return Channel.readWithCause(
    (inputChunk: Chunk<A>) => {
      const buffer = Chunk.builder<Chunk<A>>()

      const [carry, delimiterCursor] = inputChunk.reduce(
        [leftover.getOrElse(Chunk.empty<A>()), delimiterIndex] as const,
        ([carry, delimiterCursor], a) => {
          const concatenated = carry.append(a)
          if (
            delimiterCursor < delimiter.length &&
            a === delimiter.unsafeGet(delimiterCursor)
          ) {
            if (delimiterCursor + 1 === delimiter.length) {
              buffer.append(concatenated.take(concatenated.length - delimiter.length))
              return [Chunk.empty<A>(), 0]
            }
            return [concatenated, delimiterCursor + 1]
          }
          return [concatenated, a === delimiter.unsafeHead ? 1 : 0]
        }
      )

      return (
        Channel.write(buffer.build()).flatMap(() =>
          next<R, E, A>(
            delimiter,
            carry.isNonEmpty ? Maybe.some(carry) : Maybe.none,
            delimiterCursor
          )
        )
      )
    },
    (cause) =>
      leftover.fold(
        Channel.failCause(cause),
        (chunk) => Channel.write(Chunk.single(chunk)).flatMap(() => Channel.failCause(cause))
      ),
    (done) =>
      leftover.fold(
        Channel.succeed(done),
        (chunk) => Channel.write(Chunk.single(chunk)).flatMap(() => Channel.succeed(done))
      )
  )
}
