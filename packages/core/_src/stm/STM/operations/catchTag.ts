/**
 * Recovers from specified error.
 *
 * @tsplus fluent ets/STM catchTag
 */
export function catchTag_<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R,
  A,
  R1,
  E1,
  A1
>(
  self: STM<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
): STM<R | R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return self.catchAll((e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return STM.fail<any>(() => e)
  })
}

/**
 * Recovers from specified error.
 *
 * @tsplus static ets/STM/Aspects catchTag
 */
export function catchTag<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R1,
  E1,
  A1
>(k: K, f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>, __trace?: string) {
  return <R, A>(
    self: STM<R, E, A>
  ): STM<R | R1, Exclude<E, { _tag: K }> | E1, A | A1> => self.catchTag(k, f)
}
