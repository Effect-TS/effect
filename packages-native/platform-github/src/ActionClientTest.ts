/**
 * Test utilities for ActionClient service.
 *
 * Provides a mock layer factory for testing actions that use ActionClient.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import { ActionClient, ActionClientTest } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 * import { it, expect } from "@effect/vitest"
 *
 * it.effect("my action works", () =>
 *   Effect.gen(function*() {
 *     const layer = ActionClientTest.make({
 *       requestResult: { data: { login: "octocat" } }
 *     })
 *     const result = yield* ActionClient.request<{ data: { login: string } }>("GET /user").pipe(
 *       Effect.provide(layer)
 *     )
 *     expect(result.data.login).toBe("octocat")
 *   }))
 * ```
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionApiError } from "./ActionError.js"
import { ActionClient, type Octokit, TypeId } from "./ActionClient.js"

/**
 * Mock Octokit interface for testing.
 *
 * @since 1.0.0
 * @category models
 */
interface MockOctokit {
  request: (route: string, options?: Record<string, unknown>) => Promise<unknown>
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>
  paginate: (route: string, options?: Record<string, unknown>) => Promise<unknown[]>
}

/**
 * Options for creating a test ActionClient layer.
 *
 * @since 1.0.0
 * @category models
 */
export interface TestOptions {
  readonly requestResult?: unknown | Error
  readonly graphqlResult?: unknown | Error
  readonly paginateResult?: unknown[] | Error
}

/**
 * Creates a test layer for ActionClient with the given options.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: TestOptions = {}): Layer.Layer<ActionClient> => {
  const mockOctokit: MockOctokit = {
    request: async (_route, _options) => {
      if (options?.requestResult instanceof Error) {
        throw options.requestResult
      }
      return options?.requestResult ?? { data: {} }
    },
    graphql: async <T>(_query: string, _variables?: Record<string, unknown>) => {
      if (options?.graphqlResult instanceof Error) {
        throw options.graphqlResult
      }
      return (options?.graphqlResult ?? {}) as T
    },
    paginate: async (_route, _options) => {
      if (options?.paginateResult instanceof Error) {
        throw options.paginateResult
      }
      return options?.paginateResult ?? []
    }
  }

  const client: ActionClient = {
    [TypeId]: TypeId,

    octokit: mockOctokit as unknown as Octokit,

    request: <T>(route: string, opts?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => mockOctokit.request(route, opts) as Promise<T>,
        catch: (error) =>
          new ActionApiError({
            method: route,
            status: (error as { status?: number }).status,
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      }),

    graphql: <T>(query: string, variables?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => mockOctokit.graphql<T>(query, variables),
        catch: (error) =>
          new ActionApiError({
            method: "graphql",
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      }),

    paginate: <T>(route: string, opts?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => mockOctokit.paginate(route, opts) as Promise<ReadonlyArray<T>>,
        catch: (error) =>
          new ActionApiError({
            method: route,
            status: (error as { status?: number }).status,
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      })
  }

  return Layer.succeed(ActionClient, client)
}

/**
 * A default test layer that returns empty results.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ActionClient> = make()
