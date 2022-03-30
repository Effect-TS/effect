import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Option } from "../../../data/Option"
import type { IO } from "../../../io/Effect"
import type { Dequeue } from "../../../io/Queue"
import type { Take } from "../../Take"

/**
 * @tsplus static ets/PullOps fromDequeue
 */
export function fromDequeue<E, A>(
  queue: Dequeue<Take<E, A>>,
  __tsplusTrace?: string
): IO<Option<E>, Chunk<A>> {
  return queue.take.flatMap((take) => take.done())
}
