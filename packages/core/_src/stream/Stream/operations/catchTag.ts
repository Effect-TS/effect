/**
 * Recovers from specified error.
 *
 * @tsplus fluent ets/Stream catchTag
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
  self: Stream<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
): Stream<R | R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return self.catchAll((e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return Stream.fail(() => e as any)
  })
}

/**
 * Recovers from specified error.
 *
 * @tsplus static ets/Stream/Aspects catchTag
 */
export const catchTag = Pipeable(catchTag_)
