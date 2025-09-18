/**
 * Helper utilities for adjusting the environment (`R`) of Effect programs.
 *
 * These types make it ergonomic to add or remove services from an
 * `Effect.Effect` without altering its success or error channels, enabling
 * higher-order helpers to fine-tune dependency requirements.
 *
 * @since 0.1.0
 */
import type * as Effect from "effect/Effect"

/**
 * Removes a subset of services from the environment of an Effect.
 *
 * @since 0.1.0
 */
export type ExcludeR<Self extends Effect.Effect<any, any, any>, UR> = Self extends
  Effect.Effect<infer A, infer E, infer R> ? Effect.Effect<A, E, Exclude<R, UR>> : never

/**
 * Adds additional services to the environment required by an Effect.
 *
 * @since 0.1.0
 */
export type AddR<Self extends Effect.Effect<any, any, any>, UR> = Self extends
  Effect.Effect<infer A, infer E, infer R> ? Effect.Effect<A, E, R | UR> : never
