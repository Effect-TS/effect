import type { Chunk } from "../../../collection/immutable/Chunk"
import { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * A sink that executes the provided effectful function for every element fed
 * to it.
 *
 * @tsplus static ets/SinkOps forEach
 */
export function forEach<R, E, In, Z>(
  f: (input: In) => Effect<R, E, Z>,
  __tsplusTrace?: string
): Sink<R, E, In, never, void> {
  const process: Channel<
    R,
    E,
    Chunk<In>,
    unknown,
    E,
    never,
    void
  > = Channel.readWithCause(
    (chunk: Chunk<In>) => Channel.fromEffect(Effect.forEachDiscard(chunk, f)) > process,
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
  return new SinkInternal(process)
}
