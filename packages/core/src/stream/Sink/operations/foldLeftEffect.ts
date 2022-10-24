import { constTrue } from "@fp-ts/data/Function"

/**
 * A sink that effectfully folds its inputs with the provided function and
 * initial state.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldLeftEffect
 * @category folding
 * @since 1.0.0
 */
export function foldLeftEffect<R, E, In, S>(
  z: S,
  f: (s: S, input: In) => Effect<R, E, S>
): Sink<R, E, In, In, S> {
  return Sink.foldEffect(z, constTrue, f)
}
