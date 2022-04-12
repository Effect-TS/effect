import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * Provides the sink with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus fluent ets/Sink provideEnvironment
 */
export function provideEnvironment_<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  env: LazyArg<Env<R>>,
  __tsplusTrace?: string
): Sink<unknown, E, In, L, Z> {
  concreteSink(self);
  return new SinkInternal(self.channel.provideEnvironment(env));
}

/**
 * Provides the sink with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static ets/Sink/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
