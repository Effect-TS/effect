import { ContinuationK, Read } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static effect/core/stream/Channel.Ops readOrFail
 * @category constructors
 * @since 1.0.0
 */
export function readOrFail<In, E>(
  e: E
): Channel<never, unknown, In, unknown, E, never, In> {
  return new Read<never, unknown, In, unknown, E, never, In, never, In>(
    (i) => Channel.succeed(i),
    new ContinuationK(
      () => Channel.fail(e),
      () => Channel.fail(e)
    )
  )
}
