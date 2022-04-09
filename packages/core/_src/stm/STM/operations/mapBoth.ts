/**
 * Returns an `STM` effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @tsplus fluent ets/STM mapBoth
 */
export function mapBoth_<R, E, A, E1, B>(
  self: STM<R, E, A>,
  g: (e: E) => E1,
  f: (a: A) => B
): STM<R, E1, B> {
  return self.foldSTM(
    (e) => STM.fail(g(e)),
    (a) => STM.succeedNow(f(a))
  );
}

/**
 * Returns an `STM` effect whose P.failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @tsplus static ets/STM/Aspects mapBoth
 */
export const mapBoth = Pipeable(mapBoth_);
