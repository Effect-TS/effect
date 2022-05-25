/**
 * Returns a new schedule that makes this schedule available on the `Right`
 * side of an `Either` input, allowing propagating some type `X` through this
 * channel on demand.
 *
 * @tsplus fluent ets/Schedule right
 * @tsplus fluent ets/Schedule/WithState right
 */
export function right<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>
): Schedule<Tuple<[void, State]>, Env, Either<X, In>, Either<X, Out>> {
  return Schedule.identity<X>() + self
}
