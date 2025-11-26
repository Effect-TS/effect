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
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { ActionInputError, ActionOIDCError } from "./ActionError.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/ActionRunner")

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
export const ActionRunner: Context.Tag<ActionRunner, ActionRunner> = Context.GenericTag<ActionRunner>(
  "@effect-native/platform-github/ActionRunner"
)

// Accessor functions will be added after implementation
