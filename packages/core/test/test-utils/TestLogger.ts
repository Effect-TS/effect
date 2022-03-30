import type { Array } from "../../src/collection/immutable/Array"
import type { List } from "../../src/collection/immutable/List"
import type * as Map from "../../src/collection/immutable/Map"
import type { Lazy } from "../../src/data/Function"
import type { Has } from "../../src/data/Has"
import { tag } from "../../src/data/Has"
import type { Cause } from "../../src/io/Cause"
import type { UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import type { FiberId } from "../../src/io/FiberId"
import type { FiberRef } from "../../src/io/FiberRef"
import { Layer } from "../../src/io/Layer"
import type { Logger } from "../../src/io/Logger"
import type { LogLevel } from "../../src/io/LogLevel"
import type { LogSpan } from "../../src/io/LogSpan"
import { RuntimeConfig } from "../../src/io/RuntimeConfig"
import type { TraceElement } from "../../src/io/TraceElement"
import { AtomicReference } from "../../src/support/AtomicReference"

// TODO(Mike/Max): move this to `@effect-ts/test`
export const TestLoggerId = Symbol.for("@effect-ts/core/test/TestLogger")
export type TestLoggerId = typeof TestLoggerId

/**
 * A `TestLogger` is an implementation of a `Logger` that writes all log
 * messages to an internal data structure. The contents of this data structure
 * can be accessed using the `logOutput` operator. This makes it easy to write
 * tests to verify that expected messages are being logged.
 *
 * @tsplus type ets/TestLogger
 */
export interface TestLogger<Message, Output> extends Logger<Message, Output> {
  readonly [TestLoggerId]: TestLoggerId
  readonly logOutput: UIO<Array<LogEntry>>
}

/**
 * @tsplus type ets/TestLoggerOps
 */
export interface TestLoggerOps {}
export const TestLogger: TestLoggerOps = {}

/**
 * @tsplus unify ets/Logger
 */
export function unify<X extends TestLogger<any, any>>(
  self: X
): TestLogger<
  [X] extends [TestLogger<infer MX, any>] ? MX : never,
  [X] extends [TestLogger<any, infer OX>] ? OX : never
> {
  return self
}

export const HasTestLogger = tag<TestLogger<string, void>>(TestLoggerId)

export type HasTestLogger = Has<TestLogger<string, void>>

/**
 * @tsplus static ets/TestLoggerOps isTestLogger
 */
export function isTestLogger(u: unknown): u is TestLogger<unknown, unknown> {
  return typeof u === "object" && u != null && TestLoggerId in u
}

/**
 * A log entry captures all of the contents of a log message as a data
 * structure.
 */
export class LogEntry {
  constructor(
    readonly trace: TraceElement,
    readonly fiberId: FiberId,
    readonly logLevel: LogLevel,
    readonly message: Lazy<string>,
    readonly cause: Lazy<Cause<any>>,
    readonly context: Map.Map<FiberRef<unknown>, unknown>,
    readonly spans: List<LogSpan>,
    readonly annotations: Map.Map<string, string>
  ) {}

  call<A>(logger: Logger<string, A>): A {
    return logger.apply(
      this.trace,
      this.fiberId,
      this.logLevel,
      this.message,
      this.cause,
      this.context,
      this.spans,
      this.annotations
    )
  }
}

/**
 * @tsplus static ets/TestLoggerOps
 */
const makeTestLogger: UIO<TestLogger<string, void>> = Effect.succeed(() => {
  const logOutput = new AtomicReference<Array<LogEntry>>([])
  return {
    [TestLoggerId]: TestLoggerId,
    apply: (
      trace,
      fiberId,
      logLevel,
      message,
      cause,
      context,
      spans,
      annotations
    ): void => {
      const oldState = logOutput.get
      logOutput.set([
        ...oldState,
        new LogEntry(
          trace,
          fiberId,
          logLevel,
          message,
          cause,
          context,
          spans,
          annotations
        )
      ])
    },
    logOutput: Effect.succeed(logOutput.get)
  }
})

/**
 * A layer which constructs a new `TestLogger` and runs the effect it is
 * provided to with the `RuntimeConfig` updated to add the `TestLogger`.
 *
 * @tsplus static ets/TestLoggerOps default
 */
export const defaultTestLogger: Layer<unknown, never, any> = Layer.scopedRaw(
  Effect.Do()
    .bind("runtimeConfig", () => Effect.runtimeConfig)
    .bind("testLogger", () => makeTestLogger)
    .flatMap(({ runtimeConfig, testLogger }) =>
      Effect.setRuntimeConfig(
        RuntimeConfig({ ...runtimeConfig.value, logger: testLogger })
      )
    )
)

/**
 * Accesses the contents of the current test logger.
 *
 * @tsplus static ets/TestLoggerOps logOutput
 */
export const logOutput: UIO<Array<LogEntry>> = Effect.runtimeConfig.flatMap(
  (runtimeConfig) =>
    isTestLogger(runtimeConfig.value.logger)
      ? runtimeConfig.value.logger.logOutput
      : Effect.dieMessage("Error: TestLogger is missing")
)
