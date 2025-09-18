/**
 * @since 0.3.0
 * @internal */
import * as Effect from "effect/Effect"

/**
 * @since 0.3.0
 * @internal */
export type MaybeEffect<A, E = never, R = never> = Effect.Effect<A, E, R> | A

/**
 * @since 0.3.0
 * @internal */
export function MaybeEffect(self: null | undefined): null
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R>): Effect.Effect<A, E, R>
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R> | null | undefined) {
  if (self == null) {
    return null
  }
  if (Effect.isEffect(self)) {
    return self
  }
  return Effect.succeed(self)
}
