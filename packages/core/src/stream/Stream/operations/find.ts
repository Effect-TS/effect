import { Chunk } from "../../../collection/immutable/Chunk"
import type { Predicate, Refinement } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * predicate.
 *
 * @tsplus fluent ets/Stream find
 */
export function find_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  f: Refinement<A, B>,
  __tsplusTrace?: string
): Stream<R, E, B>
export function find_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A>
export function find_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  const loop: Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, any> = Channel.readWith(
    (chunk) => chunk.find(f).fold(loop, (a) => Channel.write(Chunk.single(a))),
    (e) => Channel.fail(e),
    (_) => Channel.unit
  )
  concreteStream(self)
  return new StreamInternal(self.channel >> loop)
}

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * predicate.
 */
export const find = Pipeable(find_)
