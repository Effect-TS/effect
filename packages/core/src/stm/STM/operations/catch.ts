import { STM } from "../definition"

/**
 * Recovers from specified error.
 *
 * @tsplus fluent ets/STM catch
 */
export function catch_<N extends keyof E, K extends E[N] & string, E, R, A, R1, E1, A1>(
  self: STM<R, E, A>,
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => STM<R1, E1, A1>
): STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return self.catchAll((e) => {
    if (tag in e && e[tag] === k) {
      return f(e as any)
    }
    return STM.fail<any>(() => e)
  })
}

/**
 * Recovers from specified error.
 *
 * @ets_data_first catch_
 */
function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => STM<R1, E1, A1>
) {
  return <R, A>(
    self: STM<R, E, A>
  ): STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> => self.catch(tag, k, f)
}

export { _catch as catch }
