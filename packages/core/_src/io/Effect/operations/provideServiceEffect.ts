/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Effect provideServiceEffect
 */
export function provideServiceEffect_<R1, E1, R, E, A, T>(
  self: Effect<R, E, A>,
  tag: Tag<T>,
  effect: Effect<R1, E1, T>,
  __tsplusTrace?: string
): Effect<R1 | Exclude<R, T>, E | E1, A> {
  return Effect.environmentWithEffect((env: Env<R1 | Exclude<R, T>>) =>
    effect.flatMap((service) => self.provideEnvironment(env.add(tag, service) as Env<R | R1>))
  )
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Effect/Aspects provideServiceEffect
 */
export const provideServiceEffect = Pipeable(provideServiceEffect_)
