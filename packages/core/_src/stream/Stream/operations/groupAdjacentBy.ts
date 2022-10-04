import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream that groups on adjacent keys, calculated by function f.
 *
 * @tsplus static effect/core/stream/Stream.Aspects groupAdjacentBy
 * @tsplus pipeable effect/core/stream/Stream groupAdjacentBy
 */
export function groupAdjacentBy<A, K>(f: (a: A) => K) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, readonly [K, Chunk<A>]> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> chunkAdjacent<E, A, K>(Maybe.none, f))
  }
}

function chunkAdjacent<E, A, K>(
  buffer: Maybe<readonly [K, Chunk<A>]>,
  f: (a: A) => K
): Channel<never, E, Chunk<A>, unknown, E, Chunk<readonly [K, Chunk<A>]>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk<A>) => {
      const [outputs, newBuffer] = go(chunk, buffer, f)
      return Channel.write(outputs).flatMap(() => chunkAdjacent<E, A, K>(newBuffer, f))
    },
    (cause) => Channel.failCause(cause),
    () => buffer.fold(Channel.unit, (o) => Channel.write(Chunk.single(o)))
  )
}

function go<A, K>(
  input: Chunk<A>,
  state: Maybe<readonly [K, Chunk<A>]>,
  f: (a: A) => K
): readonly [Chunk<readonly [K, Chunk<A>]>, Maybe<readonly [K, Chunk<A>]>] {
  return input.reduce(
    [Chunk.empty<readonly [K, Chunk<A>]>(), state] as const,
    ([os, o], a) =>
      o.fold([os, Maybe.some([f(a), Chunk.single(a)] as const)] as const, (agg) => {
        const k2 = f(a)
        const [k, aggregated] = agg

        if (k === k2) {
          return [os, Maybe.some([k, aggregated.append(a)] as const)] as const
        } else {
          return [os.append(agg), Maybe.some([k2, Chunk.single(a)] as const)] as const
        }
      })
  )
}
