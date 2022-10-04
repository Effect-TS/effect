/**
 * @tsplus getter effect/core/io/Metrics/Metric withNow
 */
export function withNow<Type, In, Out>(self: Metric<Type, readonly [In, number], Out>) {
  return self.contramap((input: In) => [input, Date.now()] as const)
}
