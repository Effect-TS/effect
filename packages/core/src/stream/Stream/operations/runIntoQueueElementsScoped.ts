import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Exit } from "../../../io/Exit"
import type { Enqueue } from "../../../io/Queue"
import type { HasScope } from "../../../io/Scope"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream } from "./_internal/StreamInternal"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus fluent ets/Stream runIntoQueueElementsScoped
 */
export function runIntoQueueElementsScoped_<R, E extends E1, A, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<Enqueue<Exit<Option<E1>, A>>>,
  __tsplusTrace?: string
): Effect<R & HasScope, E | E1, void> {
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
    .runScoped()
    .asUnit()
}

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 */
export const runIntoQueueElementsScoped = Pipeable(runIntoQueueElementsScoped_)
