import { STM } from "../definition"

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
  )
}

/**
 * Returns an `STM` effect whose P.failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @ets_data_first mapBoth_
 */
export function mapBoth<R, E, A, E1, B>(g: (e: E) => E1, f: (a: A) => B) {
  return (self: STM<R, E, A>): STM<R, E1, B> => self.mapBoth(g, f)
}
