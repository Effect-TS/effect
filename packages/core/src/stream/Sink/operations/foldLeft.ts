import { constTrue } from "@fp-ts/data/Function"

/**
 * A sink that folds its inputs with the provided function and initial state.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldLeft
 * @category folding
 * @since 1.0.0
 */
export function foldLeft<In, S>(
  z: S,
  f: (s: S, input: In) => S
): Sink<never, never, In, never, S> {
  return Sink.fold(z, constTrue, f).dropLeftover
}
