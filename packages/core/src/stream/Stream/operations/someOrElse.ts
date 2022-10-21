/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @tsplus static effect/core/stream/Stream.Aspects someOrElse
 * @tsplus pipeable effect/core/stream/Stream someOrElse
 */
export function someOrElse<A2>(def: LazyArg<A2>) {
  return <R, E, A>(self: Stream<R, E, Maybe<A>>): Stream<R, E, A | A2> =>
    self.map(
      (option) => option.getOrElse(def)
    )
}
