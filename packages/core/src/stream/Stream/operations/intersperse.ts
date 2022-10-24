import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Intersperse stream with provided element.
 *
 * @tsplus static effect/core/stream/Stream.Aspects intersperse
 * @tsplus pipeable effect/core/stream/Stream intersperse
 * @category mutations
 * @since 1.0.0
 */
export function intersperse<A2>(middle: A2) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A | A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> writer<R, E, A, A2>(middle, true))
  }
}

function writer<R, E, A, A2>(
  middle: A2,
  isFirst: boolean
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A | A2>, void> {
  return Channel.readWith(
    (chunk: Chunk.Chunk<A>) => {
      const builder: Array<A | A2> = []
      let flagResult = isFirst
      pipe(
        chunk,
        Chunk.forEach((value) => {
          if (flagResult) {
            flagResult = false
            builder.push(value)
          } else {
            builder.push(middle)
            builder.push(value)
          }
        })
      )
      return Channel.write(Chunk.unsafeFromArray(builder)).flatMap(() =>
        writer<R, E, A, A2>(middle, flagResult)
      )
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
