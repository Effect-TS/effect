import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that ignores its inputs.
 *
 * @tsplus static ets/Sink/Ops drain
 */
export function drain(
  __tsplusTrace?: string
): Sink<never, never, unknown, never, void> {
  const loop: Channel<
    never,
    never,
    Chunk<unknown>,
    unknown,
    never,
    Chunk<never>,
    void
  > = Channel.readWith(
    () => loop,
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
