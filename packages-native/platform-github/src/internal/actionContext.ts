/**
 * @since 1.0.0
 */
import * as github from "@actions/github"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Api from "../ActionContext.js"
import { ActionContextError } from "../ActionError.js"

/** @internal */
export const TypeId: Api.TypeId = Symbol.for(
  "@effect-native/platform-github/ActionContext"
) as Api.TypeId

/** @internal */
export const ActionContext = GenericTag<Api.ActionContext>(
  "@effect-native/platform-github/ActionContext"
)

/** @internal */
const make: Api.ActionContext = {
  [TypeId]: TypeId,

  eventName: github.context.eventName,
  payload: github.context.payload as Record<string, unknown>,
  workflow: github.context.workflow,
  action: github.context.action,
  actor: github.context.actor,
  job: github.context.job,
  runId: github.context.runId,
  runNumber: github.context.runNumber,
  runAttempt: github.context.runAttempt,
  ref: github.context.ref,
  sha: github.context.sha,
  apiUrl: github.context.apiUrl,
  serverUrl: github.context.serverUrl,
  graphqlUrl: github.context.graphqlUrl,

  repo: Effect.try({
    try: () => github.context.repo,
    catch: (error) =>
      new ActionContextError({
        reason: "InvalidRepo",
        description: error instanceof Error ? error.message : String(error),
        cause: error
      })
  }),

  issue: Effect.try({
    try: () => github.context.issue,
    catch: (error) =>
      new ActionContextError({
        reason: "InvalidRepo",
        description: error instanceof Error ? error.message : String(error),
        cause: error
      })
  })
}

/** @internal */
export const layer = Layer.succeed(ActionContext, make)
