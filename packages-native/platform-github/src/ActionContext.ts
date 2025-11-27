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
import type { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type { ActionContextError } from "./ActionError.js"
import * as internal from "./internal/actionContext.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = internal.TypeId

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
export const ActionContext: Tag<ActionContext, ActionContext> = internal.ActionContext

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ActionContext> = internal.layer

/**
 * @since 1.0.0
 * @category accessors
 */
export const eventName: Effect.Effect<string, never, ActionContext> = Effect.map(
  ActionContext,
  (ctx) => ctx.eventName
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const payload: Effect.Effect<Record<string, unknown>, never, ActionContext> = Effect.map(
  ActionContext,
  (ctx) => ctx.payload
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const workflow: Effect.Effect<string, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.workflow)

/**
 * @since 1.0.0
 * @category accessors
 */
export const action: Effect.Effect<string, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.action)

/**
 * @since 1.0.0
 * @category accessors
 */
export const actor: Effect.Effect<string, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.actor)

/**
 * @since 1.0.0
 * @category accessors
 */
export const job: Effect.Effect<string, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.job)

/**
 * @since 1.0.0
 * @category accessors
 */
export const runId: Effect.Effect<number, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.runId)

/**
 * @since 1.0.0
 * @category accessors
 */
export const runNumber: Effect.Effect<number, never, ActionContext> = Effect.map(
  ActionContext,
  (ctx) => ctx.runNumber
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const runAttempt: Effect.Effect<number, never, ActionContext> = Effect.map(
  ActionContext,
  (ctx) => ctx.runAttempt
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const ref: Effect.Effect<string, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.ref)

/**
 * @since 1.0.0
 * @category accessors
 */
export const sha: Effect.Effect<string, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.sha)

/**
 * @since 1.0.0
 * @category accessors
 */
export const apiUrl: Effect.Effect<string, never, ActionContext> = Effect.map(ActionContext, (ctx) => ctx.apiUrl)

/**
 * @since 1.0.0
 * @category accessors
 */
export const serverUrl: Effect.Effect<string, never, ActionContext> = Effect.map(
  ActionContext,
  (ctx) => ctx.serverUrl
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const graphqlUrl: Effect.Effect<string, never, ActionContext> = Effect.map(
  ActionContext,
  (ctx) => ctx.graphqlUrl
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const repo: Effect.Effect<RepoContext, ActionContextError, ActionContext> = Effect.flatMap(
  ActionContext,
  (ctx) => ctx.repo
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const issue: Effect.Effect<IssueContext, ActionContextError, ActionContext> = Effect.flatMap(
  ActionContext,
  (ctx) => ctx.issue
)
