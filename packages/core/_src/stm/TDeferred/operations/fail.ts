/**
 * @tsplus fluent ets/TDeferred fail
 */
export function fail_<E, A>(self: TDeferred<E, A>, e: E): USTM<boolean> {
  return self.done(Either.left(e))
}

/**
 * @tsplus static ets/TDeferred/Aspects fail
 */
export const fail = Pipeable(fail_)
