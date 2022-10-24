import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Summarize a sink by running an effect when the sink starts and again when
 * it completes
 *
 * @tsplus static effect/core/stream/Sink.Aspects summarized
 * @tsplus pipeable effect/core/stream/Sink summarized
 * @category mutations
 * @since 1.0.0
 */
export function summarized<R1, E1, B, C>(
  summary: Effect<R1, E1, B>,
  f: (x: B, y: B) => C
) {
  return <R, E, In, L, Z>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R1, E | E1, In, L, readonly [Z, C]> =>
    new SinkInternal(
      Channel.fromEffect(summary).flatMap((start) => {
        concreteSink(self)
        return self.channel.flatMap((done) =>
          Channel.fromEffect(summary).map((end) => [done, f(start, end)] as const)
        )
      })
    )
}
