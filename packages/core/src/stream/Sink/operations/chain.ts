import { Sink } from "../definition"

/**
 * Runs this sink until it yields a result, then uses that result to create
 * another sink from the provided function which will continue to run until it
 * yields a result.
 *
 * This function essentially runs sinks in sequence.
 *
 * @tsplus fluent ets/Sink flatMap
 */
export function chain_<R, R1, E, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
): Sink<R & R1, E | E1, In & In1, L1, Z1> {
  return self.foldSink((e) => Sink.fail(e), f)
}

/**
 * Runs this sink until it yields a result, then uses that result to create
 * another sink from the provided function which will continue to run until it
 * yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export const chain = Pipeable(chain_)
