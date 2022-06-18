/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus getter ets/Effect none
 */
export function none<R, E, A>(
  self: Effect<R, E, Maybe<A>>,
  __tsplusTrace?: string
): Effect<R, Maybe<E>, void> {
  return self.foldEffect(
    (e) => Effect.fail(Maybe.some(e)),
    (option) => option.fold(Effect.succeedNow(undefined), () => Effect.fail(Maybe.none))
  )
}
