/**
 * Creates a sink that effectfully folds elements of type `In` into a
 * structure of type `S` until `max` elements have been folded.
 *
 * Like `foldWeightedEffect`, but with a constant cost function of 1.
 *
 * @tsplus static ets/Sink/Ops foldUntilEffect
 */
export function foldUntilEffect<R, E, In, S>(
  z: LazyArg<S>,
  max: number,
  f: (s: S, input: In) => Effect<R, E, S>,
  __tsplusTrace?: string
): Sink<R, E, In, In, S> {
  return Sink.foldEffect(
    Tuple(z(), 0),
    (tuple) => tuple.get(1) < max,
    ({ tuple: [o, count] }, i: In) => f(o, i).map((s) => Tuple(s, count + 1))
  ).map((tuple) => tuple.get(0))
}
