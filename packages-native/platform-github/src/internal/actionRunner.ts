/**
 * @since 1.0.0
 */
import * as core from "@actions/core"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionInputError, ActionOIDCError } from "../ActionError.js"
import type * as Api from "../ActionRunner.js"

/** @internal */
export const TypeId: Api.TypeId = Symbol.for(
  "@effect-native/platform-github/ActionRunner"
) as Api.TypeId

/** @internal */
export const ActionRunner = GenericTag<Api.ActionRunner>(
  "@effect-native/platform-github/ActionRunner"
)

/** @internal */
const make: Api.ActionRunner = {
  [TypeId]: TypeId,

  getInput: (name, options) => Effect.sync(() => core.getInput(name, options)),

  getMultilineInput: (name, options) => Effect.sync(() => core.getMultilineInput(name, options)),

  getBooleanInput: (name, options) =>
    Effect.try({
      try: () => core.getBooleanInput(name, options),
      catch: (error) =>
        new ActionInputError({
          reason: "InvalidType",
          name,
          cause: error
        })
    }),

  setOutput: (name, value) => Effect.sync(() => core.setOutput(name, value)),

  debug: (message) => Effect.sync(() => core.debug(message)),

  info: (message) => Effect.sync(() => core.info(message)),

  warning: (message, properties?) =>
    Effect.sync(() => core.warning(message, properties as core.AnnotationProperties | undefined)),

  error: (message, properties?) =>
    Effect.sync(() => core.error(message, properties as core.AnnotationProperties | undefined)),

  notice: (message, properties?) =>
    Effect.sync(() => core.notice(message, properties as core.AnnotationProperties | undefined)),

  startGroup: (name) => Effect.sync(() => core.startGroup(name)),

  endGroup: () => Effect.sync(() => core.endGroup()),

  group: <A, E, R>(name: string, fn: () => Effect.Effect<A, E, R>) =>
    Effect.acquireUseRelease(
      Effect.sync(() => core.startGroup(name)),
      () => fn(),
      () => Effect.sync(() => core.endGroup())
    ),

  exportVariable: (name, value) => Effect.sync(() => core.exportVariable(name, value)),

  addPath: (path) => Effect.sync(() => core.addPath(path)),

  setSecret: (secret) => Effect.sync(() => core.setSecret(secret)),

  saveState: (name, value) => Effect.sync(() => core.saveState(name, value)),

  getState: (name) => Effect.sync(() => core.getState(name)),

  setFailed: (message) => Effect.sync(() => core.setFailed(message)),

  getIDToken: (audience?) =>
    Effect.tryPromise({
      try: () => core.getIDToken(audience),
      catch: (error) =>
        new ActionOIDCError({
          reason: "RequestFailed",
          description: error instanceof Error ? error.message : String(error),
          cause: error
        })
    })
}

/** @internal */
export const layer = Layer.succeed(ActionRunner, make)
