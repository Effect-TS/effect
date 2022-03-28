import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * @tsplus static ets/SinkOps dropWhileEffect
 */
export function dropWhileEffect<R, E, In>(
  p: (input: In) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Sink<R, E, In, In, unknown> {
  const loop: Channel<
    R,
    E,
    Chunk<In>,
    unknown,
    E,
    Chunk<In>,
    unknown
  > = Channel.readWith(
    (input: Chunk<In>) =>
      Channel.unwrap(
        input
          .dropWhileEffect(p)
          .map((leftover) =>
            leftover.isEmpty()
              ? loop
              : Channel.write(leftover) > Channel.identity<E, Chunk<In>, unknown>()
          )
      ),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
