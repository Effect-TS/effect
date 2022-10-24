import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/testing/Sample.Ops unfold
 * @category constructors
 * @since 1.0.0
 */
export function unfold<S, R, A>(
  s: S,
  f: (s: S) => readonly [A, Stream<R, never, S>]
): Sample<R, A> {
  const [value, shrink] = f(s)
  return Sample(value, shrink.map(s => Option.some(Sample.unfold(s, f))).intersperse(Option.none))
}
