/**
 * ActionContext service for accessing GitHub Actions workflow context.
 *
 * Provides typed access to:
 * - Event information (name, payload)
 * - Workflow properties (name, run ID, run number, attempt)
 * - Repository context (owner, repo, ref, sha)
 * - Actor information
 * - GitHub API URLs
 *
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { ActionContextError } from "./ActionError.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/ActionContext")

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface RepoContext {
  readonly owner: string
  readonly repo: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface IssueContext {
  readonly owner: string
  readonly repo: string
  readonly number: number
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ActionContext {
  readonly [TypeId]: typeof TypeId

  // Event properties
  readonly eventName: string
  readonly payload: Record<string, unknown>

  // Workflow properties
  readonly workflow: string
  readonly action: string
  readonly actor: string
  readonly job: string

  // Run properties
  readonly runId: number
  readonly runNumber: number
  readonly runAttempt: number

  // Ref properties
  readonly ref: string
  readonly sha: string

  // URL properties
  readonly apiUrl: string
  readonly serverUrl: string
  readonly graphqlUrl: string

  // Computed properties
  readonly repo: Effect.Effect<RepoContext, ActionContextError>
  readonly issue: Effect.Effect<IssueContext, ActionContextError>
}

/**
 * @since 1.0.0
 * @category context
 */
export const ActionContext: Context.Tag<ActionContext, ActionContext> = Context.GenericTag<ActionContext>(
  "@effect-native/platform-github/ActionContext"
)

// Accessor functions will be added after implementation
