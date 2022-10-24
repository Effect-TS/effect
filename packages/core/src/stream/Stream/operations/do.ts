/**
 * @tsplus static effect/core/stream/Stream.Aspects bind
 * @tsplus pipeable effect/core/stream/Stream bind
 * @category do
 * @since 1.0.0
 */
export function bind<N extends string, K, R2, E2, A>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Stream<R2, E2, A>
) {
  return <R, E>(self: Stream<R, E, K>): Stream<R | R2, E | E2, K & { [k in N]: A }> =>
    self.flatMap((k) => f(k).map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any)))
}

/**
 * @tsplus static effect/core/stream/Stream.Aspects bindValue
 * @tsplus pipeable effect/core/stream/Streamj bindValue
 * @category do
 * @since 1.0.0
 */
export function bindValue<N extends string, K, A>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) {
  return <R, E>(self: Stream<R, E, K>): Stream<R, E, K & { [k in N]: A }> =>
    self.map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
}

/**
 * @tsplus static effect/core/stream/Stream.Ops Do
 * @category do
 * @since 1.0.0
 */
export function Do(): Stream<never, never, {}> {
  return Stream.fromEffect(Effect.succeed({}))
}
