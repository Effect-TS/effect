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
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Runtime from "effect/Runtime"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"
import * as ActionRunner from "./ActionRunner.js"
import * as ActionSummary from "./ActionSummary.js"

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
export type ActionRequirements =
  | ActionRunner.ActionRunner
  | ActionContext.ActionContext
  | ActionClient.ActionClient
  | ActionSummary.ActionSummary

/**
 * Layer providing all GitHub Action services.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer = (token: string): Layer.Layer<ActionRequirements> =>
  Layer.mergeAll(
    ActionRunner.layer,
    ActionContext.layer,
    ActionClient.layer(token),
    ActionSummary.layer
  )

/**
 * Run an Effect as a GitHub Action.
 *
 * Requirements:
 * - Effect must have E = never (all errors handled)
 * - Automatically provides ActionRequirements
 * - Sets failure status and exits appropriately
 *
 * On defects (unexpected errors), this function will:
 * 1. Call `setFailed` with the error message
 * 2. Re-throw the error
 *
 * @since 1.0.0
 * @category running
 */
export const runMain = async <A>(
  effect: Effect.Effect<A, never, ActionRequirements>,
  token?: string
): Promise<A> => {
  // Note: process.env access is intentional bootstrap code.
  // User code accesses the token via ActionClient, never directly.
  const githubToken = token ?? process.env.GITHUB_TOKEN ?? ""
  const actionLayer = layer(githubToken)
  const program = Effect.provide(effect, actionLayer)

  try {
    return await Effect.runPromise(program)
  } catch (error) {
    // If we get here, something went wrong with the runtime itself.
    // Await the import to ensure setFailed completes before re-throwing.
    const core = await import("@actions/core")
    core.setFailed(error instanceof Error ? error.message : String(error))
    throw error
  }
}

/**
 * Create a runtime with all GitHub Action services provided.
 *
 * Useful for advanced use cases where you need more control over execution.
 *
 * @since 1.0.0
 * @category running
 */
export const makeRuntime = (
  token: string
): Effect.Effect<Runtime.Runtime<ActionRequirements>, never, never> => {
  const actionLayer = layer(token)
  return Effect.scoped(
    Effect.map(Layer.toRuntime(actionLayer), (rt) => rt as Runtime.Runtime<ActionRequirements>)
  )
}
