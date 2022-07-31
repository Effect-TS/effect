import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Intersperse stream with provided element.
 *
 * @tsplus static effect/core/stream/Stream.Aspects intersperse
 * @tsplus pipeable effect/core/stream/Stream intersperse
 */
export function intersperse<A2>(
  middle: LazyArg<A2>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A | A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> writer<R, E, A, A2>(middle(), true))
  }
}

function writer<R, E, A, A2>(
  middle: A2,
  isFirst: boolean
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A | A2>, void> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const builder = Chunk.builder<A | A2>()
      let flagResult = isFirst

      chunk.forEach((value) => {
        if (flagResult) {
          flagResult = false
          builder.append(value)
        } else {
          builder.append(middle)
          builder.append(value)
        }
      })

      return Channel.write(builder.build()) > writer<R, E, A, A2>(middle, flagResult)
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
