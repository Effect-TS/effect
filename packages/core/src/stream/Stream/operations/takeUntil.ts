import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Predicate } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Takes all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @tsplus fluent ets/Stream takeUntil
 */
export function takeUntil_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  const loop: Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> = Channel.readWith(
    (chunk: Chunk<A>) => {
      const taken = chunk.takeWhile((a) => !f(a))
      const last = chunk.drop(taken.length).take(1)
      return last.isEmpty() ? Channel.write(taken) > loop : Channel.write(taken + last)
    },
    (err) => Channel.fail(err),
    (done) => Channel.succeed(done)
  )
  concreteStream(self)
  return new StreamInternal(self.channel >> loop)
}

/**
 * Takes all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @tsplus static ets/StreamOps takeUntil
 */
export const takeUntil = Pipeable(takeUntil_)
