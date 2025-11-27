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
import type { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type { ActionApiError } from "./ActionError.js"
import * as internal from "./internal/actionClient.js"

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
export const ActionClient: Tag<ActionClient, ActionClient> = internal.ActionClient

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (token: string) => Layer.Layer<ActionClient> = internal.layer

/**
 * @since 1.0.0
 * @category accessors
 */
export const octokit: Effect.Effect<Octokit, never, ActionClient> = Effect.map(ActionClient, (client) => client.octokit)

/**
 * @since 1.0.0
 * @category accessors
 */
export const request: <T>(
  route: string,
  options?: Record<string, unknown>
) => Effect.Effect<T, ActionApiError, ActionClient> = (route, options) =>
  Effect.flatMap(ActionClient, (client) => client.request(route, options))

/**
 * @since 1.0.0
 * @category accessors
 */
export const graphql: <T>(
  query: string,
  variables?: Record<string, unknown>
) => Effect.Effect<T, ActionApiError, ActionClient> = (query, variables) =>
  Effect.flatMap(ActionClient, (client) => client.graphql(query, variables))

/**
 * @since 1.0.0
 * @category accessors
 */
export const paginate: <T>(
  route: string,
  options?: Record<string, unknown>
) => Effect.Effect<ReadonlyArray<T>, ActionApiError, ActionClient> = (route, options) =>
  Effect.flatMap(ActionClient, (client) => client.paginate(route, options))
