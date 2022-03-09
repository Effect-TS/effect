import { Channel, ContinuationK, Read } from "../definition"

/**
 * @tsplus static ets/ChannelOps readOrFail
 */
export function readOrFail<In, E>(
  e: E
): Channel<unknown, unknown, In, unknown, E, never, In> {
  return new Read<unknown, unknown, In, unknown, E, never, In, never, In>(
    Channel.succeedNow,
    new ContinuationK(
      () => Channel.fail(e),
      () => Channel.fail(e)
    )
  )
}
