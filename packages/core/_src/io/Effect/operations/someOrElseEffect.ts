/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus static effect/core/io/Effect.Aspects someOrElseEffect
 * @tsplus pipeable effect/core/io/Effect someOrElseEffect
 */
export function someOrElseEffect<R2, E2, B>(
  orElse: LazyArg<Effect<R2, E2, B>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, Maybe<A>>): Effect<R | R2, E | E2, A | B> =>
    (self as Effect<R, E, Maybe<A | B>>).flatMap((option) => option.map(Effect.succeedNow).getOrElse(orElse))
}
