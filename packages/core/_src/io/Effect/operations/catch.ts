/**
 * Recovers from specified error.
 *
 * @tsplus fluent ets/Effect catch
 */
export function catch_<N extends keyof E, K extends E[N] & string, E, R, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => Effect<R1, E1, A1>,
  __tsplusTrace?: string
): Effect<R | R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return self.catch(tag, k, f)
}

/**
 * Recovers from specified error.
 *
 * @tsplus static ets/Effect/Aspects catch
 */
export function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => Effect<R1, E1, A1>,
  __tsplusTrace?: string
) {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R | R1, Exclude<E, { [n in N]: K }> | E1, A | A1> =>
    self.catchAll((e) => {
      if (tag in e && e[tag] === k) {
        return f(e as any)
      }
      return Effect.failNow(e as any)
    })
}

export { _catch as catch }
