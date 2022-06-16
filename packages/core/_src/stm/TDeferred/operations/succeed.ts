/**
 * @tsplus fluent ets/TDeferred succeed
 */
export function succeed_<E, A>(self: TDeferred<E, A>, a: A): USTM<boolean> {
  return self.done(Either.right(a))
}

/**
 * @tsplus static ets/TDeferred/Aspects succeed
 */
export const succeed = Pipeable(succeed_)
