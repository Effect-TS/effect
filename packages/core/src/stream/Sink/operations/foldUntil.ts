/**
 * Creates a sink that folds elements of type `In` into a structure of type
 * `S` until `max` elements have been folded.
 *
 * Like `foldWeighted`, but with a constant cost function of 1.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldUntil
 * @category folding
 * @since 1.0.0
 */
export function foldUntil<In, S>(
  z: S,
  max: number,
  f: (s: S, input: In) => S
): Sink<never, never, In, In, S> {
  return Sink.fold(
    [z, 0 as number] as const,
    (tuple) => tuple[1] < max,
    ([o, count], i: In) => [f(o, i), count + 1] as const
  ).map((tuple) => tuple[0])
}
