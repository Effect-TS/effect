import type { LazyArg } from "../../../data/Function"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Provides the sink with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus fluent ets/Sink provideEnvironment
 */
export function provideEnvironment_<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  r: LazyArg<R>,
  __tsplusTrace?: string
): Sink<unknown, E, In, L, Z> {
  concreteSink(self)
  return new SinkInternal(self.channel.provideEnvironment(r))
}

/**
 * Provides the sink with its required environment, which eliminates its
 * dependency on `R`.
 */
export const provideEnvironment = Pipeable(provideEnvironment_)
