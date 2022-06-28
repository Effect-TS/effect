import { constTrue } from "@tsplus/stdlib/data/Function"

/**
 * A sink that folds its inputs with the provided function and initial state.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldLeft
 */
export function foldLeft<In, S>(
  z: LazyArg<S>,
  f: (s: S, input: In) => S,
  __tsplusTrace?: string
): Sink<never, never, In, never, S> {
  return Sink.fold(z, constTrue, f).dropLeftover
}
