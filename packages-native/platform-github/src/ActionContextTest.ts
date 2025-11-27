/**
 * Test utilities for ActionContext service.
 *
 * Provides a mock layer factory for testing actions that use ActionContext.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import { ActionContext, ActionContextTest } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const layer = ActionContextTest.make({ eventName: "pull_request", actor: "octocat" })
 * const program = ActionContext.eventName.pipe(Effect.provide(layer))
 * // Effect.runSync(program) // => "pull_request"
 * ```
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionContext, TypeId } from "./ActionContext.js"
import { ActionContextError } from "./ActionError.js"

/**
 * Options for creating a test ActionContext layer.
 *
 * @since 1.0.0
 * @category models
 */
export interface TestOptions {
  readonly eventName?: string
  readonly payload?: Record<string, unknown>
  readonly workflow?: string
  readonly action?: string
  readonly actor?: string
  readonly job?: string
  readonly runId?: number
  readonly runNumber?: number
  readonly runAttempt?: number
  readonly ref?: string
  readonly sha?: string
  readonly apiUrl?: string
  readonly serverUrl?: string
  readonly graphqlUrl?: string
  readonly repo?: { owner: string; repo: string } | Error
  readonly issue?: { owner: string; repo: string; number: number } | Error
}

/**
 * Creates a test layer for ActionContext with the given options.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: TestOptions = {}): Layer.Layer<ActionContext> => {
  const context: ActionContext = {
    [TypeId]: TypeId,
    eventName: options.eventName ?? "push",
    payload: options.payload ?? {},
    workflow: options.workflow ?? "CI",
    action: options.action ?? "run",
    actor: options.actor ?? "octocat",
    job: options.job ?? "build",
    runId: options.runId ?? 12345,
    runNumber: options.runNumber ?? 1,
    runAttempt: options.runAttempt ?? 1,
    ref: options.ref ?? "refs/heads/main",
    sha: options.sha ?? "abc123def456",
    apiUrl: options.apiUrl ?? "https://api.github.com",
    serverUrl: options.serverUrl ?? "https://github.com",
    graphqlUrl: options.graphqlUrl ?? "https://api.github.com/graphql",
    repo: options.repo instanceof Error
      ? Effect.fail(
        new ActionContextError({
          reason: "InvalidRepo",
          description: options.repo.message
        })
      )
      : Effect.succeed(options.repo ?? { owner: "octocat", repo: "hello-world" }),
    issue: options.issue instanceof Error
      ? Effect.fail(
        new ActionContextError({
          reason: "InvalidRepo",
          description: options.issue.message
        })
      )
      : Effect.succeed(options.issue ?? { owner: "octocat", repo: "hello-world", number: 1 })
  }

  return Layer.succeed(ActionContext, context)
}

/**
 * A default test layer with sensible defaults.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ActionContext> = make()
