/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 *
 * @tsplus fluent ets/XPure mapBoth
 */
export function mapBoth_<W, S1, S2, R, E, A, E1, A1>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
) {
  return self.foldXPure(
    (e) => XPure.fail(f(e)),
    (a) => XPure.succeed(g(a))
  );
}

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 *
 * @tsplus static ets/XPure/Aspects mapBoth
 */
export const mapBoth = Pipeable(mapBoth_);
