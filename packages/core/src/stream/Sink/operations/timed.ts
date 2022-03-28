import type { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import type { HasClock } from "../../../io/Clock"
import { Clock } from "../../../io/Clock"
import { Sink } from "../definition"

/**
 * Returns the sink that executes this one and times its execution in
 * milliseconds.
 *
 * @tsplus fluent ets/Sink timed
 */
export function withDuration<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  __tsplusTrace?: string
): Sink<R & HasClock, E, In, L, Tuple<[Z, Duration]>> {
  return self.summarized(Clock.currentTime, (start, end) => Duration(end - start))
}

/**
 * Times the execution of a sink in milliseconds.
 *
 * @tsplus static ets/SinkOps timed
 */
export function timed(
  __tsplusTrace?: string
): Sink<HasClock, never, unknown, never, Duration> {
  return Sink.drain()
    .timed()
    .map((tuple) => tuple.get(1))
}
