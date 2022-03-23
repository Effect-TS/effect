import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Managed } from "../../../io/Managed"
import type { XQueue } from "../../../io/Queue"
import { Channel } from "../../Channel"
import { Take } from "../../Take"
import type { Stream } from "../definition"
import { concreteStream } from "./_internal/StreamInternal"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a `Managed` to
 * allow for scope composition.
 *
 * @tsplus fluent ets/Stream runIntoQueueManaged
 */
export function runIntoQueueManaged_<R, E extends E1, A, R1, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<XQueue<R1, never, never, unknown, Take<E1, A>, unknown>>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, void> {
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
  return Managed.succeed(queue).flatMap((queue) =>
    (self.channel >> writer)
      .mapOutEffect((take) => queue.offer(take))
      .drain()
      .runManaged()
      .asUnit()
  )
}

/**
 * Like `Stream.runIntoQueue`, but provides the result as a `Managed` to
 * allow for scope composition.
 */
export const runIntoQueueManaged = Pipeable(runIntoQueueManaged_)
