import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @tsplus fluent ets/Stream mapEffect
 */
export function mapEffect_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, B> {
  concreteStream(self)
  return new StreamInternal(
    self.channel >> loop(Chunk.empty<A>()[Symbol.iterator](), f)
  )
}

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @tsplus static ets/Stream/Aspects mapEffect
 */
export const mapEffect = Pipeable(mapEffect_)

function loop<R, E, A, R1, E1, A1>(
  chunkIterator: Iterator<A>,
  f: (a: A) => Effect<R1, E1, A1>
): Channel<R & R1, E, Chunk<A>, unknown, E | E1, Chunk<A1>, unknown> {
  const next = chunkIterator.next()
  if (next.done) {
    return Channel.readWithCause(
      elem => loop(elem[Symbol.iterator](), f),
      err => Channel.failCause(err),
      done => Channel.succeed(done)
    )
  } else {
    return Channel.unwrap(
      f(next.value).map(
        a1 =>
          Channel.write(Chunk.single(a1)) >
            loop<R, E, A, R1, E1, A1>(chunkIterator, f)
      )
    )
  }
}
