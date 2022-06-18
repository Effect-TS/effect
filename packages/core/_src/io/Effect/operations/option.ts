/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @tsplus fluent ets/Effect option
 */
export function option<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect.RIO<R, Maybe<A>> {
  return self.foldEffect(
    () => Effect.succeedNow(Maybe.none),
    (a) => Effect.succeedNow(Maybe.some(a))
  )
}
