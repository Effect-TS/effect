/**
 * Returns a new schedule that makes this schedule available on the `Left`
 * side of an `Either` input, allowing propagating some type `X` through this
 * channel on demand.
 *
 * @tsplus fluent ets/Schedule left
 * @tsplus fluent ets/Schedule/WithState left
 */
export function left<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>
): Schedule<Tuple<[State, void]>, Env, Either<In, X>, Either<Out, X>> {
  return self + Schedule.identity<X>()
}
