/**
 * ActionClient service for GitHub API access.
 *
 * Provides Effect-wrapped access to:
 * - Raw Octokit client for full API access
 * - Convenience methods for common operations
 * - Automatic error handling and type conversion
 * - Pagination helpers
 *
 * @since 1.0.0
 */
import type { GitHub } from "@actions/github/lib/utils.js"
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { ActionApiError } from "./ActionError.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/ActionClient")

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export type Octokit = InstanceType<typeof GitHub>

/**
 * @since 1.0.0
 * @category models
 */
export interface ActionClient {
  readonly [TypeId]: typeof TypeId

  /**
   * Raw Octokit client for full API access.
   */
  readonly octokit: Octokit

  /**
   * Make a REST API request with Effect error handling.
   */
  readonly request: <T>(
    route: string,
    options?: Record<string, unknown>
  ) => Effect.Effect<T, ActionApiError>

  /**
   * Make a GraphQL API request with Effect error handling.
   */
  readonly graphql: <T>(
    query: string,
    variables?: Record<string, unknown>
  ) => Effect.Effect<T, ActionApiError>

  /**
   * Paginate through REST API results.
   */
  readonly paginate: <T>(
    route: string,
    options?: Record<string, unknown>
  ) => Effect.Effect<ReadonlyArray<T>, ActionApiError>
}

/**
 * @since 1.0.0
 * @category context
 */
export const ActionClient: Context.Tag<ActionClient, ActionClient> = Context.GenericTag<ActionClient>(
  "@effect-native/platform-github/ActionClient"
)

// Accessor functions and layer will be added after implementation
