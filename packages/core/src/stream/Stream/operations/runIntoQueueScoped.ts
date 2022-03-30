import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Enqueue } from "../../../io/Queue"
import type { HasScope } from "../../../io/Scope"
import { Channel } from "../../Channel"
import { Take } from "../../Take"
import type { Stream } from "../definition"
import { concreteStream } from "./_internal/StreamInternal"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus fluent ets/Stream runIntoQueueScoped
 */
export function runIntoQueueScoped_<R, E extends E1, A, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<Enqueue<Take<E1, A>>>,
  __tsplusTrace?: string
): Effect<R & HasScope, E | E1, void> {
  const writer: Channel<
    R,
    E,
    Chunk<A>,
    unknown,
    E,
    Take<E | E1, A>,
    unknown
  > = Channel.readWithCause(
    (input: Chunk<A>) => Channel.write(Take.chunk(input)) > writer,
    (cause) => Channel.write(Take.failCause(cause)),
    () => Channel.write(Take.end)
  )
  concreteStream(self)
  return Effect.succeed(queue).flatMap((queue) =>
    (self.channel >> writer)
      .mapOutEffect((take) => queue.offer(take))
      .drain()
      .runScoped()
      .asUnit()
  )
}

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 */
export const runIntoQueueScoped = Pipeable(runIntoQueueScoped_)
