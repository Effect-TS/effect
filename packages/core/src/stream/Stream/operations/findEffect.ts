import { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * effectful predicate.
 *
 * @tsplus fluent ets/Stream findEffect
 */
export function findEffect_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R1, E1, boolean>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  const loop: Channel<
    R1,
    E,
    Chunk<A>,
    unknown,
    E | E1,
    Chunk<A>,
    any
  > = Channel.readWith(
    (chunk: Chunk<A>) =>
      Channel.unwrap(
        chunk
          .findEffect(f)
          .map((option) => option.fold(loop, (a) => Channel.write(Chunk.single(a))))
      ),
    (e) => Channel.fail(e),
    () => Channel.unit
  )
  concreteStream(self)
  return new StreamInternal(self.channel >> loop)
}

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * effectful predicate.
 */
export const findEffect = Pipeable(findEffect_)
