/**
 * @since 1.0.0
 */
import * as internal from "@effect/platform-browser/internal/runtime"
import type * as Effect from "effect/Effect"

/**
 * @since 1.0.0
 * @category runtime
 */
export const runMain: <E, A>(effect: Effect.Effect<never, E, A>) => void = internal.runMain
