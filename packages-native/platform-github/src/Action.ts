/**
 * Combined Action module for GitHub Actions development.
 *
 * Provides:
 * - Combined layer including all services
 * - runMain for running actions with proper error handling
 * - Convenience type exports
 *
 * @since 1.0.0
 */
import * as core from "@actions/core"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import type * as FiberId from "effect/FiberId"
import { constVoid } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Option from "effect/Option"
import type * as Runtime from "effect/Runtime"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"
import { isActionFailure } from "./ActionError.js"
import * as ActionRunner from "./ActionRunner.js"
import * as ActionSummary from "./ActionSummary.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/Action")

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * Combined requirements for all GitHub Action services.
 *
 * @since 1.0.0
 * @category models
 */
export type ActionRequirements =
  | ActionRunner.ActionRunner
  | ActionContext.ActionContext
  | ActionClient.ActionClient
  | ActionSummary.ActionSummary

/**
 * Layer providing all GitHub Action services.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer = (token: string): Layer.Layer<ActionRequirements> =>
  Layer.mergeAll(
    ActionRunner.layer,
    ActionContext.layer,
    ActionClient.layer(token),
    ActionSummary.layer
  )

/**
 * Options for runMain.
 *
 * @since 1.0.0
 * @category running
 */
export interface RunMainOptions {
  /**
   * Turn off automatic error logging.
   * @default false
   */
  readonly disableErrorReporting?: boolean
  /**
   * Use default logger instead of pretty logger.
   * @default false
   */
  readonly disablePrettyLogger?: boolean
  /**
   * GitHub token for API access. Defaults to GITHUB_TOKEN env var.
   */
  readonly token?: string
}

/**
 * Format a Cause for GitHub Actions UI display.
 *
 * For known failure types (ActionFailure), provides nice formatting.
 * For other errors, uses Cause.pretty.
 *
 * @internal
 */
const formatCauseForGitHub = <E>(cause: Cause.Cause<E>): string => {
  const failure = Cause.failureOption(cause)
  if (Option.isSome(failure)) {
    const e = failure.value
    // Check for known failure types with displayMessage
    if (isActionFailure(e)) {
      return e.displayMessage
    }
    // For other errors, try to get a message
    if (e instanceof Error) {
      return e.message
    }
    if (typeof e === "object" && e !== null && "message" in e) {
      return String((e as { message: unknown }).message)
    }
  }
  // Fallback to Cause.pretty for complex failures (multiple errors, defects)
  return Cause.pretty(cause)
}

/**
 * Add pretty logger to fiber refs.
 *
 * @internal
 */
const addPrettyLogger = (refs: FiberRefs.FiberRefs, fiberId: FiberId.Runtime) => {
  const loggers = FiberRefs.getOrDefault(refs, FiberRef.currentLoggers)
  if (!HashSet.has(loggers, Logger.defaultLogger)) {
    return refs
  }
  return FiberRefs.updateAs(refs, {
    fiberId,
    fiberRef: FiberRef.currentLoggers,
    value: loggers.pipe(
      HashSet.remove(Logger.defaultLogger),
      HashSet.add(Logger.prettyLoggerDefault)
    )
  })
}

/**
 * Run an Effect as a GitHub Action.
 *
 * This is the main entry point for GitHub Actions built with Effect.
 * Unlike the previous version, this accepts **any error type E** and
 * handles errors automatically:
 *
 * - Errors are logged via Effect's logging system
 * - Known failure types (InputValidationFailure, ActionFailed) are formatted nicely
 * - `core.setFailed()` is called with the error message
 * - Exit code is set appropriately (0 for success, 1 for failure)
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const count = yield* Input.parse("count", Schema.NumberFromString)
 *   yield* ActionRunner.info(`Count: ${count}`)
 * })
 *
 * // Errors handled automatically
 * Action.runMain(program)
 * ```
 *
 * @since 1.0.0
 * @category running
 */
export const runMain = <E, A>(
  effect: Effect.Effect<A, E, ActionRequirements>,
  options?: RunMainOptions
): void => {
  // Get token from options or environment
  const githubToken = options?.token ?? process.env.GITHUB_TOKEN ?? ""
  const actionLayer = layer(githubToken)

  // Provide the layer
  const withLayer = Effect.provide(effect, actionLayer)

  // Wrap with error logging (unless disabled)
  const withLogging = options?.disableErrorReporting === true
    ? withLayer
    : Effect.tapErrorCause(withLayer, (cause) => {
        if (Cause.isInterruptedOnly(cause)) {
          return Effect.void
        }
        return Effect.logError(cause)
      })

  // Start the fiber
  const fiber = Effect.runFork(withLogging, {
    updateRefs: options?.disablePrettyLogger === true ? undefined : addPrettyLogger
  })

  // Keep process alive
  const keepAlive = setInterval(constVoid, 2 ** 31 - 1)
  let receivedSignal = false

  // Handle completion
  fiber.addObserver((exit) => {
    // Clean up signal handlers if we didn't receive a signal
    if (!receivedSignal) {
      process.removeListener("SIGINT", onSigint)
      process.removeListener("SIGTERM", onSigint)
    }
    clearInterval(keepAlive)

    // Handle exit status
    if (Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause)) {
      // Format error message for GitHub UI
      const message = formatCauseForGitHub(exit.cause)
      core.setFailed(message)
      process.exitCode = 1
    }

    // Exit if we received a signal or if there was an error
    if (receivedSignal || (Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause))) {
      process.exit(process.exitCode ?? 0)
    }
  })

  // Handle interrupt signals
  function onSigint() {
    receivedSignal = true
    process.removeListener("SIGINT", onSigint)
    process.removeListener("SIGTERM", onSigint)
    fiber.unsafeInterruptAsFork(fiber.id())
  }

  process.on("SIGINT", onSigint)
  process.on("SIGTERM", onSigint)
}

/**
 * Create a runtime with all GitHub Action services provided.
 *
 * Useful for advanced use cases where you need more control over execution.
 *
 * @since 1.0.0
 * @category running
 */
export const makeRuntime = (
  token: string
): Effect.Effect<Runtime.Runtime<ActionRequirements>, never, never> => {
  const actionLayer = layer(token)
  return Effect.scoped(
    Effect.map(Layer.toRuntime(actionLayer), (rt) => rt as Runtime.Runtime<ActionRequirements>)
  )
}
