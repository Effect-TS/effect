/**
 * Returns an `STM` effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @tsplus static effect/core/stm/STM.Aspects mapBoth
 * @tsplus pipeable effect/core/stm/STM mapBoth
 * @category mapping
 * @since 1.0.0
 */
export function mapBoth<E, E1, A, A1>(g: (e: E) => E1, f: (a: A) => A1) {
  return <R>(self: STM<R, E, A>): STM<R, E1, A1> =>
    self.foldSTM(
      (e) => STM.failSync(g(e)),
      (a) => STM.sync(f(a))
    )
}
