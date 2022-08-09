/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideServiceEffect
 * @tsplus pipeable effect/core/io/Effect provideServiceEffect
 */
export function provideServiceEffect<T, R1, E1>(tag: Tag<T>, effect: Effect<R1, E1, T>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R1 | Exclude<R, T>, E | E1, A> =>
    Effect.environmentWithEffect((env: Env<R1 | Exclude<R, T>>) =>
      effect.flatMap((service) => self.provideEnvironment(env.add(tag, service) as Env<R | R1>))
    )
}
