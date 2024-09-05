/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"
import type * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import { dual } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Logger from "effect/Logger"

/**
 * @category model
 * @since 1.0.0
 */
export interface Teardown {
  <E, A>(exit: Exit.Exit<E, A>, onExit: (code: number) => void): void
}

/**
 * @category teardown
 * @since 1.0.0
 */
export const defaultTeardown: Teardown = <E, A>(
  exit: Exit.Exit<E, A>,
  onExit: (code: number) => void
) => {
  onExit(Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause) ? 1 : 0)
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RunMain {
  (
    options?: {
      readonly disableErrorReporting?: boolean | undefined
      readonly disablePrettyLogger?: boolean | undefined
      readonly teardown?: Teardown | undefined
    }
  ): <E, A>(effect: Effect.Effect<A, E>) => void
  <E, A>(
    effect: Effect.Effect<A, E>,
    options?: {
      readonly disableErrorReporting?: boolean | undefined
      readonly disablePrettyLogger?: boolean | undefined
      readonly teardown?: Teardown | undefined
    }
  ): void
}

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
 * @category constructors
 * @since 1.0.0
 */
export const makeRunMain = (
  f: <E, A>(
    options: {
      readonly fiber: Fiber.RuntimeFiber<A, E>
      readonly teardown: Teardown
    }
  ) => void
): RunMain =>
  dual((args) => Effect.isEffect(args[0]), (effect: Effect.Effect<any, any>, options?: {
    readonly disableErrorReporting?: boolean | undefined
    readonly disablePrettyLogger?: boolean | undefined
    readonly teardown?: Teardown | undefined
  }) => {
    const fiber = options?.disableErrorReporting === true
      ? Effect.runFork(effect, {
        updateRefs: options?.disablePrettyLogger === true ? undefined : addPrettyLogger
      })
      : Effect.runFork(
        Effect.tapErrorCause(effect, (cause) => {
          if (Cause.isInterruptedOnly(cause)) {
            return Effect.void
          }
          return Effect.logError(cause)
        }),
        {
          updateRefs: options?.disablePrettyLogger === true ? undefined : addPrettyLogger
        }
      )
    const teardown = options?.teardown ?? defaultTeardown
    return f({ fiber, teardown })
  })
