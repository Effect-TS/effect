import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps fromEither
 */
export function fromEither<E, A>(
  either: LazyArg<Either<E, A>>
): Channel<unknown, unknown, unknown, unknown, E, never, A> {
  return Channel.suspend(either().fold(Channel.failNow, Channel.succeedNow))
}
