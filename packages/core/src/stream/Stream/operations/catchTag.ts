/**
 * Recovers from specified error.
 *
 * @tsplus static effect/core/stream/Stream.Aspects catchTag
 * @tsplus pipeable effect/core/stream/Stream catchTag
 * @category alternatives
 * @since 1.0.0
 */
export function catchTag<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R1,
  E1,
  A1
>(
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R1, Exclude<E, { _tag: K }> | E1, A | A1> =>
    self.catchAll((e) => {
      if ("_tag" in e && e["_tag"] === k) {
        return f(e as any)
      }
      return Stream.fail(e as any)
    })
}
