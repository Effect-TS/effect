import { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
  return new StreamInternal(self.channel >> chunkAdjacent<E, A, K>(Option.none, f))
}

/**
 * Creates a stream that groups on adjacent keys, calculated by function f.
 *
 * @tsplus static ets/StreamOps groupAdjacentBy
 */
export const groupAdjacentBy = Pipeable(groupAdjacentBy_)

function chunkAdjacent<E, A, K>(
  buffer: Option<Tuple<[K, Chunk<A>]>>,
  f: (a: A) => K,
  __tsplusTrace?: string
): Channel<unknown, E, Chunk<A>, unknown, E, Chunk<Tuple<[K, Chunk<A>]>>, unknown> {
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
  state: Option<Tuple<[K, Chunk<A>]>>,
  f: (a: A) => K,
  __tsplusTrace?: string
): Tuple<[Chunk<Tuple<[K, Chunk<A>]>>, Option<Tuple<[K, Chunk<A>]>>]> {
  return input.reduce(
    Tuple(Chunk.empty<Tuple<[K, Chunk<A>]>>(), state),
    ({ tuple: [os, o] }, a) =>
      o.fold(Tuple(os, Option.some(Tuple(f(a), Chunk.single(a)))), (agg) => {
        const k2 = f(a)
        const {
          tuple: [k, aggregated]
        } = agg

        if (k === k2) {
          return Tuple(os, Option.some(Tuple(k, aggregated.append(a))))
        } else {
          return Tuple(os.append(agg), Option.some(Tuple(k2, Chunk.single(a))))
        }
      })
  )
}
