/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static effect/core/io/Effect.Ops unit
 */
export const unit: Effect<never, never, void> = Effect.succeed(undefined)

/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static effect/core/io/Effect.Ops unitTraced
 */
export function unitTraced(): Effect<never, never, void> {
  return Effect.succeed(undefined)
}

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus getter effect/core/io/Effect unit
 */
export function asUnit<R, E, X>(self: Effect<R, E, X>): Effect<R, E, void> {
  return self.zipRight(Effect.unit)
}
