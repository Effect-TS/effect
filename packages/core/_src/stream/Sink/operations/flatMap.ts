/**
 * Runs this sink until it yields a result, then uses that result to create
 * another sink from the provided function which will continue to run until it
 * yields a result.
 *
 * This function essentially runs sinks in sequence.
 *
 * @tsplus static effect/core/stream/Sink.Aspects flatMap
 * @tsplus pipeable effect/core/stream/Sink flatMap
 */
export function flatMap<R1, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(
  f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
) {
  return <R, E>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E | E1, In & In1, L1, Z1> =>
    self.foldSink((e) => Sink.failSync(e), f)
}
