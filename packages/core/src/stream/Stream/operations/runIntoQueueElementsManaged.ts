import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Exit } from "../../../io/Exit"
import type { Managed } from "../../../io/Managed"
import type { XQueue } from "../../../io/Queue"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream } from "./_internal/StreamInternal"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a `Managed` to
 * allow for scope composition.
 *
 * @tsplus fluent ets/Stream runIntoQueueElementsManaged
 */
export function runIntoQueueElementsManaged_<R, E extends E1, A, R1, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<XQueue<R1, never, never, unknown, Exit<Option<E1>, A>, unknown>>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, void> {
  const writer: Channel<
    R,
    E,
    Chunk<A>,
    unknown,
    E,
    Exit<Option<E | E1>, A>,
    unknown
  > = Channel.readWith(
    (input: Chunk<A>) =>
      input.reduce(
        Channel.unit as Channel<
          R,
          E,
          Chunk<A>,
          unknown,
          E,
          Exit<Option<E | E1>, A>,
          unknown
        >,
        (channel, a) => channel > Channel.write(Exit.succeed(a))
      ) > writer,
    (err) => Channel.write(Exit.fail(Option.some(err))),
    () => Channel.write(Exit.fail(Option.none))
  )
  concreteStream(self)
  return (self.channel >> writer)
    .mapOutEffect((take) => queue().offer(take))
    .drain()
    .runManaged()
    .asUnit()
}

/**
 * Like `Stream.runIntoQueue`, but provides the result as a `Managed` to
 * allow for scope composition.
 */
export const runIntoQueueElementsManaged = Pipeable(runIntoQueueElementsManaged_)
