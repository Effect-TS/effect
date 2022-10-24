import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideServiceEffect
 * @tsplus pipeable effect/core/io/Effect provideServiceEffect
 * @category environment
 * @since 1.0.0
 */
export function provideServiceEffect<T, R1, E1>(tag: Context.Tag<T>, effect: Effect<R1, E1, T>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R1 | Exclude<R, T>, E | E1, A> =>
    Effect.environmentWithEffect((env: Context.Context<R1 | Exclude<R, T>>) =>
      effect.flatMap((service) =>
        self.provideEnvironment(pipe(env, Context.add(tag)(service)) as Context.Context<R | R1>)
      )
    )
}
