/**
 * @since 1.0.0
 */
import * as github from "@actions/github"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "../ActionClient.js"
import { ActionApiError } from "../ActionError.js"

/** @internal */
export const make = (token: string): ActionClient.ActionClient => {
  const octokit = github.getOctokit(token)

  return {
    [ActionClient.TypeId]: ActionClient.TypeId,

    octokit,

    request: <T>(route: string, options?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => octokit.request(route, options) as Promise<T>,
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
        try: () => octokit.graphql<T>(query, variables),
        catch: (error) =>
          new ActionApiError({
            method: "graphql",
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      }),

    paginate: <T>(route: string, options?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => octokit.paginate(route, options) as Promise<ReadonlyArray<T>>,
        catch: (error) =>
          new ActionApiError({
            method: route,
            status: (error as { status?: number }).status,
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      })
  }
}

/** @internal */
export const layer = (token: string) => Layer.succeed(ActionClient.ActionClient, make(token))
