import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Emits the provided chunk before emitting any other value.
 *
 * @tsplus fluent ets/Stream prepend
 */
export function prepend_<R, E, A, A2>(
  stream: Stream<R, E, A>,
  values: LazyArg<Chunk<A2>>,
  __tsplusTrace?: string
): Stream<R, E, A | A2> {
  concreteStream(stream)
  return new StreamInternal(Channel.write(values) > stream.channel)
}

/**
 * Emits the provided chunk before emitting any other value.
 *
 * @tsplus static ets/StreamOps prepend
 */
export const prepend = Pipeable(prepend_)
