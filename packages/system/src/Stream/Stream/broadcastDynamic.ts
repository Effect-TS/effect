import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { distributedWithDynamic_ } from "./distributedWithDynamic"
import { flattenExitOption } from "./flattenExitOption"
import { fromQueueWithShutdown } from "./fromQueueWithShutdown"

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, O>(
  self: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, T.UIO<Stream<unknown, E, O>>> {
  return M.map_(
    M.map_(
      distributedWithDynamic_(
        self,
        maximumLag,
        (_) => T.succeed((_) => true),
        (_) => T.unit
      ),
      T.map(([_, x]) => x)
    ),
    T.map((_) => flattenExitOption(fromQueueWithShutdown(_)))
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic(maximumLag: number) {
  return <R, E, O>(self: Stream<R, E, O>) => broadcastDynamic_(self, maximumLag)
}
