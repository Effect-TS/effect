/**
 * Recovers from specified error.
 *
 * @tsplus static effect/core/stm/STM.Aspects catch
 * @tsplus pipeable effect/core/stm/STM catch
 */
export function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => STM<R1, E1, A1>
) {
  return <R, A>(
    self: STM<R, E, A>
  ): STM<R | R1, Exclude<E, { [n in N]: K }> | E1, A | A1> =>
    self.catchAll((e) => {
      if (tag in e && e[tag] === k) {
        return f(e as any)
      }
      return STM.fail<any>(() => e)
    })
}

export { _catch as catch }
