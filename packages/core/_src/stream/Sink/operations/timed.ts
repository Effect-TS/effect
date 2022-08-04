import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * Returns the sink that executes this one and times its execution in
 * milliseconds.
 *
 * @tsplus getter effect/core/stream/Sink timed
 */
export function withDuration<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
): Sink<R, E, In, L, Tuple<[Z, Duration]>> {
  return self.summarized(Clock.currentTime, (start, end) => new DurationInternal(end - start))
}

/**
 * Times the execution of a sink in milliseconds.
 *
 * @tsplus static effect/core/stream/Sink.Aspects timed
 */
export function timed(): Sink<never, never, unknown, never, Duration> {
  return Sink.drain().timed.map((tuple) => tuple.get(1))
}
