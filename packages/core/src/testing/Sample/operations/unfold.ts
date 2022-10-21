/**
 * @tsplus static effect/core/testing/Sample.Ops unfold
 */
export function unfold<S, R, A>(
  s: S,
  f: (s: S) => readonly [A, Stream<R, never, S>]
): Sample<R, A> {
  const [value, shrink] = f(s)
  return Sample(value, shrink.map(s => Maybe.some(Sample.unfold(s, f))).intersperse(Maybe.none))
}
