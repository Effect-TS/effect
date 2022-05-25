/**
 * Creates a sink that folds elements of type `In` into a structure of type
 * `S` until `max` elements have been folded.
 *
 * Like `foldWeighted`, but with a constant cost function of 1.
 *
 * @tsplus static ets/Sink/Ops foldUntil
 */
export function foldUntil<In, S>(
  z: LazyArg<S>,
  max: number,
  f: (s: S, input: In) => S,
  __tsplusTrace?: string
): Sink<unknown, never, In, In, S> {
  return Sink.fold(
    Tuple(z(), 0),
    (tuple) => tuple.get(1) < max,
    ({ tuple: [o, count] }, i: In) => Tuple(f(o, i), count + 1)
  ).map((tuple) => tuple.get(0))
}
