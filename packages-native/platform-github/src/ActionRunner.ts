/**
 * ActionRunner service for interacting with GitHub Actions runner.
 *
 * Provides Effect-wrapped access to @actions/core functionality:
 * - Input/output handling
 * - Logging (debug, info, warning, error, notice)
 * - Groups for collapsible log sections
 * - Environment variable management
 * - State persistence between steps
 * - OIDC token retrieval
 *
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type { ActionInputError, ActionOIDCError } from "./ActionError.js"
import * as internal from "./internal/actionRunner.js"

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
export interface ActionRunner {
  readonly [TypeId]: typeof TypeId

  // Input methods
  readonly getInput: (name: string, options?: { required?: boolean; trimWhitespace?: boolean }) => Effect.Effect<string>
  readonly getMultilineInput: (
    name: string,
    options?: { required?: boolean; trimWhitespace?: boolean }
  ) => Effect.Effect<ReadonlyArray<string>>
  readonly getBooleanInput: (
    name: string,
    options?: { required?: boolean }
  ) => Effect.Effect<boolean, ActionInputError>

  // Output methods
  readonly setOutput: (name: string, value: unknown) => Effect.Effect<void>

  // Logging methods
  readonly debug: (message: string) => Effect.Effect<void>
  readonly info: (message: string) => Effect.Effect<void>
  readonly warning: (message: string | Error, properties?: AnnotationProperties) => Effect.Effect<void>
  readonly error: (message: string | Error, properties?: AnnotationProperties) => Effect.Effect<void>
  readonly notice: (message: string | Error, properties?: AnnotationProperties) => Effect.Effect<void>

  // Group methods
  readonly startGroup: (name: string) => Effect.Effect<void>
  readonly endGroup: () => Effect.Effect<void>
  readonly group: <A, E, R>(name: string, fn: () => Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>

  // Environment methods
  readonly exportVariable: (name: string, value: string) => Effect.Effect<void>
  readonly addPath: (path: string) => Effect.Effect<void>
  readonly setSecret: (secret: string) => Effect.Effect<void>

  // State methods
  readonly saveState: (name: string, value: unknown) => Effect.Effect<void>
  readonly getState: (name: string) => Effect.Effect<string>

  // Result methods
  readonly setFailed: (message: string | Error) => Effect.Effect<void>

  // OIDC methods
  readonly getIDToken: (audience?: string) => Effect.Effect<string, ActionOIDCError>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface AnnotationProperties {
  readonly title?: string
  readonly file?: string
  readonly startLine?: number
  readonly endLine?: number
  readonly startColumn?: number
  readonly endColumn?: number
}

/**
 * @since 1.0.0
 * @category context
 */
export const ActionRunner: Tag<ActionRunner, ActionRunner> = internal.ActionRunner

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ActionRunner> = internal.layer

/**
 * @since 1.0.0
 * @category accessors
 */
export const getInput: (
  name: string,
  options?: { required?: boolean; trimWhitespace?: boolean }
) => Effect.Effect<string, never, ActionRunner> = (name, options) =>
  Effect.flatMap(ActionRunner, (runner) => runner.getInput(name, options))

/**
 * @since 1.0.0
 * @category accessors
 */
export const getMultilineInput: (
  name: string,
  options?: { required?: boolean; trimWhitespace?: boolean }
) => Effect.Effect<ReadonlyArray<string>, never, ActionRunner> = (name, options) =>
  Effect.flatMap(ActionRunner, (runner) => runner.getMultilineInput(name, options))

/**
 * @since 1.0.0
 * @category accessors
 */
export const getBooleanInput: (
  name: string,
  options?: { required?: boolean }
) => Effect.Effect<boolean, ActionInputError, ActionRunner> = (name, options) =>
  Effect.flatMap(ActionRunner, (runner) => runner.getBooleanInput(name, options))

/**
 * @since 1.0.0
 * @category accessors
 */
export const setOutput: (name: string, value: unknown) => Effect.Effect<void, never, ActionRunner> = (name, value) =>
  Effect.flatMap(ActionRunner, (runner) => runner.setOutput(name, value))

/**
 * @since 1.0.0
 * @category accessors
 */
export const debug: (message: string) => Effect.Effect<void, never, ActionRunner> = (message) =>
  Effect.flatMap(ActionRunner, (runner) => runner.debug(message))

/**
 * @since 1.0.0
 * @category accessors
 */
export const info: (message: string) => Effect.Effect<void, never, ActionRunner> = (message) =>
  Effect.flatMap(ActionRunner, (runner) => runner.info(message))

/**
 * @since 1.0.0
 * @category accessors
 */
export const warning: (
  message: string | Error,
  properties?: AnnotationProperties
) => Effect.Effect<void, never, ActionRunner> = (message, properties) =>
  Effect.flatMap(ActionRunner, (runner) => runner.warning(message, properties))

/**
 * @since 1.0.0
 * @category accessors
 */
export const error: (
  message: string | Error,
  properties?: AnnotationProperties
) => Effect.Effect<void, never, ActionRunner> = (message, properties) =>
  Effect.flatMap(ActionRunner, (runner) => runner.error(message, properties))

/**
 * @since 1.0.0
 * @category accessors
 */
export const notice: (
  message: string | Error,
  properties?: AnnotationProperties
) => Effect.Effect<void, never, ActionRunner> = (message, properties) =>
  Effect.flatMap(ActionRunner, (runner) => runner.notice(message, properties))

/**
 * @since 1.0.0
 * @category accessors
 */
export const startGroup: (name: string) => Effect.Effect<void, never, ActionRunner> = (name) =>
  Effect.flatMap(ActionRunner, (runner) => runner.startGroup(name))

/**
 * @since 1.0.0
 * @category accessors
 */
export const endGroup: Effect.Effect<void, never, ActionRunner> = Effect.flatMap(
  ActionRunner,
  (runner) => runner.endGroup()
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const group: <A, E, R>(
  name: string,
  fn: () => Effect.Effect<A, E, R>
) => Effect.Effect<A, E, R | ActionRunner> = (name, fn) =>
  Effect.flatMap(ActionRunner, (runner) => runner.group(name, fn))

/**
 * @since 1.0.0
 * @category accessors
 */
export const exportVariable: (name: string, value: string) => Effect.Effect<void, never, ActionRunner> = (
  name,
  value
) => Effect.flatMap(ActionRunner, (runner) => runner.exportVariable(name, value))

/**
 * @since 1.0.0
 * @category accessors
 */
export const addPath: (path: string) => Effect.Effect<void, never, ActionRunner> = (path) =>
  Effect.flatMap(ActionRunner, (runner) => runner.addPath(path))

/**
 * @since 1.0.0
 * @category accessors
 */
export const setSecret: (secret: string) => Effect.Effect<void, never, ActionRunner> = (secret) =>
  Effect.flatMap(ActionRunner, (runner) => runner.setSecret(secret))

/**
 * @since 1.0.0
 * @category accessors
 */
export const saveState: (name: string, value: unknown) => Effect.Effect<void, never, ActionRunner> = (name, value) =>
  Effect.flatMap(ActionRunner, (runner) => runner.saveState(name, value))

/**
 * @since 1.0.0
 * @category accessors
 */
export const getState: (name: string) => Effect.Effect<string, never, ActionRunner> = (name) =>
  Effect.flatMap(ActionRunner, (runner) => runner.getState(name))

/**
 * @since 1.0.0
 * @category accessors
 */
export const setFailed: (message: string | Error) => Effect.Effect<void, never, ActionRunner> = (message) =>
  Effect.flatMap(ActionRunner, (runner) => runner.setFailed(message))

/**
 * @since 1.0.0
 * @category accessors
 */
export const getIDToken: (audience?: string) => Effect.Effect<string, ActionOIDCError, ActionRunner> = (audience) =>
  Effect.flatMap(ActionRunner, (runner) => runner.getIDToken(audience))
