/**
 * @tsplus fluent ets/Metrics/Metric withNow
 */
export function withNow<Type, In, Out>(self: Metric<Type, Tuple<[In, number]>, Out>) {
  return self.contramap((input: In) => Tuple(input, Date.now()))
}
