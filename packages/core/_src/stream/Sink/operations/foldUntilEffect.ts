/**
 * Creates a sink that effectfully folds elements of type `In` into a
 * structure of type `S` until `max` elements have been folded.
 *
 * Like `foldWeightedEffect`, but with a constant cost function of 1.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldUntilEffect
 */
export function foldUntilEffect<R, E, In, S>(
  z: S,
  max: number,
  f: (s: S, input: In) => Effect<R, E, S>
): Sink<R, E, In, In, S> {
  return Sink.foldEffect(
    [z, 0 as number] as const,
    (tuple) => tuple[1] < max,
    ([o, count], i: In) => f(o, i).map((s) => [s, count + 1] as const)
  ).map((tuple) => tuple[0])
}
