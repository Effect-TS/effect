/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Effect provideServiceEffect
 */
export function provideServiceEffect_<R, E, A, T>(
  self: Effect<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return <R1, E1>(
    effect: Effect<R1, E1, T>,
    __tsplusTrace?: string
  ): Effect<R1 & Erase<R, Has<T>>, E | E1, A> =>
    Effect.environmentWithEffect((env: Env<R & R1>) =>
      effect.flatMap((service) => self.provideEnvironment(env.add(tag, service)))
    )
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Effect/Aspects provideServiceEffect
 */
export const provideServiceEffect = Pipeable(provideServiceEffect_)
