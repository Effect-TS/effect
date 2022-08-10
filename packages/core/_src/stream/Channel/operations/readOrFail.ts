import { ContinuationK, Read } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static effect/core/stream/Channel.Ops readOrFail
 */
export function readOrFail<In, E>(
  e: E
): Channel<never, unknown, In, unknown, E, never, In> {
  return new Read<never, unknown, In, unknown, E, never, In, never, In>(
    (i) => Channel.succeed(i),
    new ContinuationK(
      () => Channel.failSync(e),
      () => Channel.failSync(e)
    )
  )
}
