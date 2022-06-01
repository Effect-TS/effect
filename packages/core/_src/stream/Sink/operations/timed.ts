/**
 * Returns the sink that executes this one and times its execution in
 * milliseconds.
 *
 * @tsplus fluent ets/Sink timed
 */
export function withDuration<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Tuple<[Z, Duration]>> {
  return self.summarized(Clock.currentTime, (start, end) => new Duration(end - start))
}

/**
 * Times the execution of a sink in milliseconds.
 *
 * @tsplus static ets/Sink/Aspects timed
 */
export function timed(
  __tsplusTrace?: string
): Sink<never, never, unknown, never, Duration> {
  return Sink.drain()
    .timed()
    .map((tuple) => tuple.get(1))
}
