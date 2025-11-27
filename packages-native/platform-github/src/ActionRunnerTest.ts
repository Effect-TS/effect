/**
 * Test utilities for ActionRunner service.
 *
 * Provides a mock layer factory for testing actions that use ActionRunner.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import { ActionRunner, ActionRunnerTest } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const test = ActionRunnerTest.make({ inputs: { name: "world" } })
 * const program = ActionRunner.getInput("name").pipe(Effect.provide(test.layer))
 * // Effect.runPromise(program) // => "world"
 * ```
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionInputError } from "./ActionError.js"
import { ActionRunner, TypeId } from "./ActionRunner.js"

/**
 * Options for creating a test ActionRunner layer.
 *
 * @since 1.0.0
 * @category models
 */
export interface TestOptions {
  readonly inputs?: Record<string, string>
  readonly state?: Record<string, string>
}

/**
 * Result of creating a test ActionRunner layer, including the layer and mutable stores
 * for inspecting outputs, logs, etc.
 *
 * @since 1.0.0
 * @category models
 */
export interface TestContext {
  readonly layer: Layer.Layer<ActionRunner>
  readonly outputs: Record<string, unknown>
  readonly logs: Array<{ level: string; message: string }>
  readonly groups: Array<string>
  readonly secrets: Array<string>
  readonly state: Record<string, string>
  readonly env: Record<string, string>
  readonly paths: Array<string>
  readonly getFailed: () => { message: string } | null
}

/**
 * Creates a test layer for ActionRunner with the given options.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: TestOptions = {}): TestContext => {
  const inputs = options.inputs ?? {}
  const outputs: Record<string, unknown> = {}
  const logs: Array<{ level: string; message: string }> = []
  const groups: Array<string> = []
  const secrets: Array<string> = []
  const state: Record<string, string> = { ...(options.state ?? {}) }
  const env: Record<string, string> = {}
  const paths: Array<string> = []
  let failed: { message: string } | null = null

  const runner: ActionRunner = {
    [TypeId]: TypeId,

    getInput: (name, opts) =>
      Effect.sync(() => {
        const val = inputs[name] ?? ""
        if (opts?.required && !val) {
          throw new Error(`Input required and not supplied: ${name}`)
        }
        return opts?.trimWhitespace === false ? val : val.trim()
      }),

    getMultilineInput: (name, opts) =>
      Effect.sync(() => {
        const val = inputs[name] ?? ""
        if (opts?.required && !val) {
          throw new Error(`Input required and not supplied: ${name}`)
        }
        const lines = val.split("\n").filter((x) => x !== "")
        return opts?.trimWhitespace === false ? lines : lines.map((l) => l.trim())
      }),

    getBooleanInput: (name, opts) =>
      Effect.try({
        try: () => {
          const val = inputs[name] ?? ""
          if (opts?.required && !val) {
            throw new Error(`Input required and not supplied: ${name}`)
          }
          if (["true", "True", "TRUE"].includes(val)) return true
          if (["false", "False", "FALSE"].includes(val)) return false
          throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}`)
        },
        catch: (error) =>
          new ActionInputError({
            reason: "InvalidType",
            name,
            cause: error
          })
      }),

    setOutput: (name, value) =>
      Effect.sync(() => {
        outputs[name] = value
      }),

    debug: (message) =>
      Effect.sync(() => {
        logs.push({ level: "debug", message })
      }),

    info: (message) =>
      Effect.sync(() => {
        logs.push({ level: "info", message })
      }),

    warning: (message) =>
      Effect.sync(() => {
        logs.push({ level: "warning", message: message instanceof Error ? message.message : message })
      }),

    error: (message) =>
      Effect.sync(() => {
        logs.push({ level: "error", message: message instanceof Error ? message.message : message })
      }),

    notice: (message) =>
      Effect.sync(() => {
        logs.push({ level: "notice", message: message instanceof Error ? message.message : message })
      }),

    startGroup: (name) =>
      Effect.sync(() => {
        groups.push(name)
      }),

    endGroup: () =>
      Effect.sync(() => {
        groups.pop()
      }),

    group: <A, E, R>(name: string, fn: () => Effect.Effect<A, E, R>) =>
      Effect.acquireUseRelease(
        Effect.sync(() => {
          groups.push(name)
        }),
        () => fn(),
        () =>
          Effect.sync(() => {
            groups.pop()
          })
      ),

    exportVariable: (name, value) =>
      Effect.sync(() => {
        env[name] = value
      }),

    addPath: (path) =>
      Effect.sync(() => {
        paths.push(path)
      }),

    setSecret: (secret) =>
      Effect.sync(() => {
        secrets.push(secret)
      }),

    saveState: (name, value) =>
      Effect.sync(() => {
        state[name] = typeof value === "string" ? value : JSON.stringify(value)
      }),

    getState: (name) =>
      Effect.sync(() => {
        return state[name] ?? ""
      }),

    setFailed: (message) =>
      Effect.sync(() => {
        failed = { message: message instanceof Error ? message.message : message }
      }),

    getIDToken: () => Effect.succeed("mock-oidc-token")
  }

  return {
    layer: Layer.succeed(ActionRunner, runner),
    outputs,
    logs,
    groups,
    secrets,
    state,
    env,
    paths,
    getFailed: () => failed
  }
}

/**
 * Creates a simple test layer with default options.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ActionRunner> = make().layer
