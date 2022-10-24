import * as Duration from "@fp-ts/data/Duration"

/**
 * Returns the sink that executes this one and times its execution in
 * milliseconds.
 *
 * @tsplus getter effect/core/stream/Sink timed
 * @category mutations
 * @since 1.0.0
 */
export function withDuration<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
): Sink<R, E, In, L, readonly [Z, Duration.Duration]> {
  return self.summarized(Clock.currentTime, (start, end) => Duration.millis(end - start))
}

/**
 * Times the execution of a sink in milliseconds.
 *
 * @tsplus static effect/core/stream/Sink.Aspects timed
 * @category constructors
 * @since 1.0.0
 */
export function timed(): Sink<never, never, unknown, never, Duration.Duration> {
  return Sink.drain().timed.map((tuple) => tuple[1])
}
