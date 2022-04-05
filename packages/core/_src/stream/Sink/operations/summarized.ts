import { concreteSink, SinkInternal } from "@effect-ts/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * Summarize a sink by running an effect when the sink starts and again when
 * it completes
 *
 * @tsplus fluent ets/Sink summarized
 */
export function summarized_<R, E, R1, E1, In, L, Z, B, C>(
  self: Sink<R, E, In, L, Z>,
  summary: LazyArg<Effect<R1, E1, B>>,
  f: (x: B, y: B) => C,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In, L, Tuple<[Z, C]>> {
  return new SinkInternal(
    Channel.unwrap(
      Effect.succeed(summary).map((summary) =>
        Channel.fromEffect(summary).flatMap((start) => {
          concreteSink(self);
          return self.channel.flatMap((done) => Channel.fromEffect(summary).map((end) => Tuple(done, f(start, end))));
        })
      )
    )
  );
}

/**
 * Summarize a sink by running an effect when the sink starts and again when
 * it completes.
 *
 * @tsplus static ets/Sink/Aspects summarized
 */
export const summarized = Pipeable(summarized_);
