import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapAccum
 * @tsplus pipeable effect/core/stream/Stream mapAccum
 */
export function mapAccum<A, S, A1>(s: S, f: (s: S, a: A) => Tuple<[S, A1]>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A1> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> accumulator<E, A, S, A1>(s, f))
  }
}

function accumulator<E, A, S, A1>(
  current: S,
  f: (s: S, a: A) => Tuple<[S, A1]>
): Channel<never, E, Chunk<A>, unknown, E, Chunk<A1>, void> {
  return Channel.readWith(
    (input: Chunk<A>) => {
      const {
        tuple: [nextS, a1s]
      } = input.mapAccum(current, f)
      return Channel.write(a1s) > accumulator<E, A, S, A1>(nextS, f)
    },
    (err: E) => Channel.fail(err),
    () => Channel.unit
  )
}
