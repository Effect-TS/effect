/**
 * Combined Action module for GitHub Actions development.
 *
 * Provides:
 * - Combined layer including all services
 * - GitHubRuntime for running actions with proper error handling
 * - Convenience type exports
 *
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type { ActionClient } from "./ActionClient.js"
import type { ActionContext } from "./ActionContext.js"
import type { ActionRunner } from "./ActionRunner.js"
import type { ActionSummary } from "./ActionSummary.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/Action")

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * Combined requirements for all GitHub Action services.
 *
 * @since 1.0.0
 * @category models
 */
export type ActionRequirements = ActionRunner | ActionContext | ActionClient | ActionSummary

/**
 * Layer providing all GitHub Action services.
 *
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (token: string) => Layer.Layer<ActionRequirements>

/**
 * Run an Effect as a GitHub Action.
 *
 * Requirements:
 * - Effect must have E = never (all errors handled)
 * - Automatically provides ActionRequirements
 * - Sets failure status and exits appropriately
 *
 * @since 1.0.0
 * @category running
 */
export declare const runMain: <A>(effect: Effect.Effect<A, never, ActionRequirements>) => Promise<A>

// Implementation will be added after all services are complete
