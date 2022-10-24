import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a sink that effectfully folds elements of type `In` into a
 * structure of type `S`, until `max` worth of elements (determined by the
 * `costFn`) have been folded.
 *
 * @note Elements that have an individual cost larger than `max` will force the
 * sink to cross the `max` cost. See `foldWeightedDecomposeEffect` for a variant
 * that can handle these cases.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldWeightedEffect
 * @category folding
 * @since 1.0.0
 */
export function foldWeightedEffect<R, E, R2, E2, In, S>(
  z: S,
  costFn: (s: S, input: In) => Effect<R, E, number>,
  max: number,
  f: (s: S, input: In) => Effect<R2, E2, S>
): Sink<R | R2, E | E2, In, In, S> {
  return Sink.foldWeightedDecomposeEffect(
    z,
    costFn,
    max,
    (i) => Effect.succeed(Chunk.single(i)),
    f
  )
}
