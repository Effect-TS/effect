/**
 * GitHubActionRunner - Effect wrappers for @actions/core
 *
 * Provides an Effect-based interface for communicating with the GitHub Actions Runner.
 * Includes inputs, outputs, logging, annotations, environment, and state management.
 *
 * @since 0.0.1
 */
import * as GHCore from "@actions/core"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * Input options for getInput
 * @since 0.0.1
 */
export interface GitHubActionInputOptions {
  /** Whether the input is required. If required and not present, will fail. Defaults to false */
  readonly required?: boolean
  /** Whether leading/trailing whitespace will be trimmed. Defaults to true */
  readonly trimWhitespace?: boolean
}

/**
 * Properties for annotations (error, warning, notice)
 * @since 0.0.1
 */
export interface GitHubActionAnnotationProperties {
  /** A title for the annotation */
  readonly title?: string
  /** The path of the file for which the annotation should be created */
  readonly file?: string
  /** The start line for the annotation */
  readonly startLine?: number
  /** The end line for the annotation */
  readonly endLine?: number
  /** The start column for the annotation */
  readonly startColumn?: number
  /** The end column for the annotation */
  readonly endColumn?: number
}

/**
 * Error representing a missing required input
 * @since 0.0.1
 */
export class GitHubActionInputRequiredError extends Error {
  /** @since 0.0.1 */
  readonly _tag = "GitHubActionInputRequiredError"
  constructor(readonly name: string) {
    super(`Input required and not supplied: ${name}`)
  }
}

/**
 * Error representing an invalid boolean input
 * @since 0.0.1
 */
export class GitHubActionInvalidBooleanInputError extends Error {
  /** @since 0.0.1 */
  readonly _tag = "GitHubActionInvalidBooleanInputError"
  constructor(readonly name: string, readonly value: string) {
    super(
      `Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` +
        `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``
    )
  }
}

/**
 * GitHub Actions Runner service interface
 * @since 0.0.1
 */
export interface GitHubActionRunner {
  // --- Inputs/Outputs ---
  /**
   * Gets the value of an input. Returns empty string if not defined.
   */
  readonly getInput: (name: string, options?: GitHubActionInputOptions) => Effect.Effect<string>

  /**
   * Gets the values of a multiline input. Each value is trimmed.
   */
  readonly getMultilineInput: (name: string, options?: GitHubActionInputOptions) => Effect.Effect<Array<string>>

  /**
   * Gets a boolean input value. Supports: true|True|TRUE|false|False|FALSE
   */
  readonly getBooleanInput: (
    name: string,
    options?: GitHubActionInputOptions
  ) => Effect.Effect<boolean, GitHubActionInvalidBooleanInputError>

  /**
   * Sets the value of an output.
   */
  readonly setOutput: (name: string, value: unknown) => Effect.Effect<void>

  // --- Logging ---
  /**
   * Writes debug message to user log
   */
  readonly debug: (message: string) => Effect.Effect<void>

  /**
   * Writes info message to log
   */
  readonly info: (message: string) => Effect.Effect<void>

  /**
   * Adds a warning issue
   */
  readonly warning: (message: string, properties?: GitHubActionAnnotationProperties) => Effect.Effect<void>

  /**
   * Adds an error issue
   */
  readonly error: (message: string, properties?: GitHubActionAnnotationProperties) => Effect.Effect<void>

  /**
   * Adds a notice issue
   */
  readonly notice: (message: string, properties?: GitHubActionAnnotationProperties) => Effect.Effect<void>

  /**
   * Gets whether Actions Step Debug is on
   */
  readonly isDebug: Effect.Effect<boolean>

  // --- Groups ---
  /**
   * Begin an output group
   */
  readonly startGroup: (name: string) => Effect.Effect<void>

  /**
   * End an output group
   */
  readonly endGroup: Effect.Effect<void>

  /**
   * Wrap an Effect in a collapsible group
   */
  readonly group: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>

  // --- Environment ---
  /**
   * Sets env variable for this action and future actions in the job
   */
  readonly exportVariable: (name: string, value: unknown) => Effect.Effect<void>

  /**
   * Prepends inputPath to the PATH
   */
  readonly addPath: (inputPath: string) => Effect.Effect<void>

  /**
   * Registers a secret which will get masked from logs
   */
  readonly setSecret: (secret: string) => Effect.Effect<void>

  // --- State ---
  /**
   * Saves state for current action's post job execution
   */
  readonly saveState: (name: string, value: unknown) => Effect.Effect<void>

  /**
   * Gets the value of state set by this action's main execution
   */
  readonly getState: (name: string) => Effect.Effect<string>

  // --- Results ---
  /**
   * Sets the action status to failed. Calling this will cause the action
   * to exit with a failure status code.
   */
  readonly setFailed: (message: string) => Effect.Effect<void>
}

/**
 * Tag for the GitHubActionRunner service
 * @since 0.0.1
 */
export const GitHubActionRunner = Context.GenericTag<GitHubActionRunner>(
  "@effect-native/github-action/GitHubActionRunner"
)

/**
 * Live implementation of GitHubActionRunner using @actions/core
 * @since 0.0.1
 */
export const GitHubActionRunnerLive: GitHubActionRunner = {
  getInput: (name, options) => Effect.sync(() => GHCore.getInput(name, options)),

  getMultilineInput: (name, options) => Effect.sync(() => GHCore.getMultilineInput(name, options)),

  getBooleanInput: (name, options) =>
    Effect.try({
      try: () => GHCore.getBooleanInput(name, options),
      catch: () => new GitHubActionInvalidBooleanInputError(name, GHCore.getInput(name, options))
    }),

  setOutput: (name, value) => Effect.sync(() => GHCore.setOutput(name, value)),

  debug: (message) => Effect.sync(() => GHCore.debug(message)),

  info: (message) => Effect.sync(() => GHCore.info(message)),

  warning: (message, properties) => Effect.sync(() => GHCore.warning(message, properties)),

  error: (message, properties) => Effect.sync(() => GHCore.error(message, properties)),

  notice: (message, properties) => Effect.sync(() => GHCore.notice(message, properties)),

  isDebug: Effect.sync(() => GHCore.isDebug()),

  startGroup: (name) => Effect.sync(() => GHCore.startGroup(name)),

  endGroup: Effect.sync(() => GHCore.endGroup()),

  group: (name, effect) =>
    Effect.acquireUseRelease(
      Effect.sync(() => GHCore.startGroup(name)),
      () => effect,
      () => Effect.sync(() => GHCore.endGroup())
    ),

  exportVariable: (name, value) => Effect.sync(() => GHCore.exportVariable(name, value)),

  addPath: (inputPath) => Effect.sync(() => GHCore.addPath(inputPath)),

  setSecret: (secret) => Effect.sync(() => GHCore.setSecret(secret)),

  saveState: (name, value) => Effect.sync(() => GHCore.saveState(name, value)),

  getState: (name) => Effect.sync(() => GHCore.getState(name)),

  setFailed: (message) => Effect.sync(() => GHCore.setFailed(message))
}

/**
 * Live layer for GitHubActionRunner
 * @since 0.0.1
 */
export const layer: Layer.Layer<GitHubActionRunner> = Layer.succeed(GitHubActionRunner, GitHubActionRunnerLive)

// --- Accessor functions ---

/**
 * Gets the value of an input
 * @since 0.0.1
 */
export const getInput = (
  name: string,
  options?: GitHubActionInputOptions
): Effect.Effect<string, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.getInput(name, options))

/**
 * Gets the values of a multiline input
 * @since 0.0.1
 */
export const getMultilineInput = (
  name: string,
  options?: GitHubActionInputOptions
): Effect.Effect<Array<string>, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.getMultilineInput(name, options))

/**
 * Gets a boolean input value
 * @since 0.0.1
 */
export const getBooleanInput = (
  name: string,
  options?: GitHubActionInputOptions
): Effect.Effect<boolean, GitHubActionInvalidBooleanInputError, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.getBooleanInput(name, options))

/**
 * Sets the value of an output
 * @since 0.0.1
 */
export const setOutput = (name: string, value: unknown): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.setOutput(name, value))

/**
 * Writes debug message to user log
 * @since 0.0.1
 */
export const debug = (message: string): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.debug(message))

/**
 * Writes info message to log
 * @since 0.0.1
 */
export const info = (message: string): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.info(message))

/**
 * Adds a warning issue
 * @since 0.0.1
 */
export const warning = (
  message: string,
  properties?: GitHubActionAnnotationProperties
): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.warning(message, properties))

/**
 * Adds an error issue
 * @since 0.0.1
 */
export const error = (
  message: string,
  properties?: GitHubActionAnnotationProperties
): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.error(message, properties))

/**
 * Adds a notice issue
 * @since 0.0.1
 */
export const notice = (
  message: string,
  properties?: GitHubActionAnnotationProperties
): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.notice(message, properties))

/**
 * Gets whether Actions Step Debug is on
 * @since 0.0.1
 */
export const isDebug: Effect.Effect<boolean, never, GitHubActionRunner> = Effect.flatMap(
  GitHubActionRunner,
  (runner) => runner.isDebug
)

/**
 * Begin an output group
 * @since 0.0.1
 */
export const startGroup = (name: string): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.startGroup(name))

/**
 * End an output group
 * @since 0.0.1
 */
export const endGroup: Effect.Effect<void, never, GitHubActionRunner> = Effect.flatMap(
  GitHubActionRunner,
  (runner) => runner.endGroup
)

/**
 * Wrap an Effect in a collapsible group
 * @since 0.0.1
 */
export const group = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, GitHubActionRunner | R> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.group(name, effect))

/**
 * Sets env variable for this action and future actions in the job
 * @since 0.0.1
 */
export const exportVariable = (name: string, value: unknown): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.exportVariable(name, value))

/**
 * Prepends inputPath to the PATH
 * @since 0.0.1
 */
export const addPath = (inputPath: string): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.addPath(inputPath))

/**
 * Registers a secret which will get masked from logs
 * @since 0.0.1
 */
export const setSecret = (secret: string): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.setSecret(secret))

/**
 * Saves state for current action's post job execution
 * @since 0.0.1
 */
export const saveState = (name: string, value: unknown): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.saveState(name, value))

/**
 * Gets the value of state set by this action's main execution
 * @since 0.0.1
 */
export const getState = (name: string): Effect.Effect<string, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.getState(name))

/**
 * Sets the action status to failed
 * @since 0.0.1
 */
export const setFailed = (message: string): Effect.Effect<void, never, GitHubActionRunner> =>
  Effect.flatMap(GitHubActionRunner, (runner) => runner.setFailed(message))
