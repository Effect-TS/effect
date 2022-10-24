/**
 * @tsplus getter effect/core/io/Metrics/Metric withNow
 * @category mutations
 * @since 1.0.0
 */
export function withNow<Type, In, Out>(self: Metric<Type, readonly [In, number], Out>) {
  return self.contramap((input: In) => [input, Date.now()] as const)
}
