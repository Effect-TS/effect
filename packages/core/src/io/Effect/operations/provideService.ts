import type { Tag } from "@fp-ts/data/Context"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideService
 * @tsplus pipeable effect/core/io/Effect provideService
 * @category environment
 * @since 1.0.0
 */
export function provideService<T>(tag: Tag<T>, resource: T) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<Exclude<R, T>, E, A> =>
    self.provideServiceEffect(tag, Effect.succeed(resource))
}
