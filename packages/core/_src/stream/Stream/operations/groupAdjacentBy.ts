import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream that groups on adjacent keys, calculated by function f.
 *
 * @tsplus fluent ets/Stream groupAdjacentBy
 */
export function groupAdjacentBy_<R, E, A, K>(
  self: Stream<R, E, A>,
  f: (a: A) => K,
  __tsplusTrace?: string
) {
  concreteStream(self)
  return new StreamInternal(self.channel >> chunkAdjacent<E, A, K>(Maybe.none, f))
}

/**
 * Creates a stream that groups on adjacent keys, calculated by function f.
 *
 * @tsplus static ets/Stream/Aspects groupAdjacentBy
 */
export const groupAdjacentBy = Pipeable(groupAdjacentBy_)

function chunkAdjacent<E, A, K>(
  buffer: Maybe<Tuple<[K, Chunk<A>]>>,
  f: (a: A) => K,
  __tsplusTrace?: string
): Channel<never, E, Chunk<A>, unknown, E, Chunk<Tuple<[K, Chunk<A>]>>, unknown> {
  return Channel.readWithCause(
    (chunk: Chunk<A>) => {
      const {
        tuple: [outputs, newBuffer]
      } = go(chunk, buffer, f)
      return Channel.write(outputs) > chunkAdjacent<E, A, K>(newBuffer, f)
    },
    (cause) => Channel.failCause(cause),
    () => buffer.fold(Channel.unit, (o) => Channel.write(Chunk.single(o)))
  )
}

function go<A, K>(
  input: Chunk<A>,
  state: Maybe<Tuple<[K, Chunk<A>]>>,
  f: (a: A) => K,
  __tsplusTrace?: string
): Tuple<[Chunk<Tuple<[K, Chunk<A>]>>, Maybe<Tuple<[K, Chunk<A>]>>]> {
  return input.reduce(
    Tuple(Chunk.empty<Tuple<[K, Chunk<A>]>>(), state),
    ({ tuple: [os, o] }, a) =>
      o.fold(Tuple(os, Maybe.some(Tuple(f(a), Chunk.single(a)))), (agg) => {
        const k2 = f(a)
        const {
          tuple: [k, aggregated]
        } = agg

        if (k === k2) {
          return Tuple(os, Maybe.some(Tuple(k, aggregated.append(a))))
        } else {
          return Tuple(os.append(agg), Maybe.some(Tuple(k2, Chunk.single(a))))
        }
      })
  )
}
