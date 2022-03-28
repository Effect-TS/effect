import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @tsplus fluent ets/Stream mapAccum
 */
export function mapAccum_<R, E, A, S, A1>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => Tuple<[S, A1]>,
  __tsplusTrace?: string
): Stream<R, E, A1> {
  return Stream.succeed(s).flatMap((s) => {
    concreteStream(self)
    return new StreamInternal(self.channel >> accumulator<E, A, S, A1>(s, f))
  })
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @tsplus static ets/StreamOps mapAccum
 */
export const mapAccum = Pipeable(mapAccum_)

function accumulator<E, A, S, A1>(
  current: S,
  f: (s: S, a: A) => Tuple<[S, A1]>,
  __tsplusTrace?: string
): Channel<unknown, E, Chunk<A>, unknown, E, Chunk<A1>, void> {
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
