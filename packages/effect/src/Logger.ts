/**
 * Defines loggers and log-event data for Effect programs.
 *
 * A `Logger<Message, Output>` receives each log event as `Options` and turns it
 * into output such as a formatted string, structured object, console write,
 * file write, JSON line, or trace span event. This module also includes active
 * logger references, console routing helpers, built-in formatters, batching,
 * file logging, and layers for installing loggers.
 *
 * @since 2.0.0
 */
import * as Array from "./Array.ts"
import type * as Cause from "./Cause.ts"
import type * as Context from "./Context.ts"
import type * as Duration from "./Duration.ts"
import type * as Effect from "./Effect.ts"
import type * as Fiber from "./Fiber.ts"
import * as FileSystem from "./FileSystem.ts"
import * as Formatter from "./Formatter.ts"
import { dual } from "./Function.ts"
import { isEffect, withFiber } from "./internal/core.ts"
import * as effect from "./internal/effect.ts"
import * as InternalRecord from "./internal/record.ts"
import * as Layer from "./Layer.ts"
import type * as LogLevel from "./LogLevel.ts"
import type { Pipeable } from "./Pipeable.ts"
import type { PlatformError } from "./PlatformError.ts"
import * as Predicate from "./Predicate.ts"
import { CurrentLogAnnotations, CurrentLogSpans } from "./References.ts"
import type * as Scope from "./Scope.ts"

const TypeId = "~effect/Logger"

/**
 * A logger that transforms a runtime log event into an output value.
 *
 * **Details**
 *
 * The runtime calls `log` with the message, level, cause, fiber, and timestamp
 * for each log event. Use `Logger.layer` to install one or more loggers for an
 * effect.
 *
 * @category models
 * @since 2.0.0
 */
export interface Logger<in Message, out Output> extends Pipeable {
  readonly [TypeId]: typeof TypeId
  log(options: Options<Message>): Output
}

/**
 * Information supplied to a `Logger` for a single log event.
 *
 * **Details**
 *
 * Includes the logged message, log level, cause, current fiber, and timestamp.
 *
 * @category options
 * @since 2.0.0
 */
export interface Options<out Message> {
  readonly message: Message
  readonly logLevel: LogLevel.LogLevel
  readonly cause: Cause.Cause<unknown>
  readonly fiber: Fiber.Fiber<unknown, unknown>
  readonly date: Date
}

/**
 * Returns `true` if the specified value is a `Logger`, otherwise returns `false`.
 *
 * @category guards
 * @since 4.0.0
 */
export const isLogger = (u: unknown): u is Logger<unknown, unknown> => Predicate.hasProperty(u, TypeId)

/**
 * Context reference containing the active loggers for the current fiber.
 *
 * **Details**
 *
 * By default this set includes the default logger and the tracer logger.
 * Providing `Logger.layer` replaces or merges with this set depending on its
 * options.
 *
 * @category references
 * @since 4.0.0
 */
export const CurrentLoggers: Context.Reference<ReadonlySet<Logger<unknown, any>>> = effect.CurrentLoggers

/**
 * Context reference that routes the built-in default logger and TTY pretty
 * console logger to stderr.
 *
 * **When to use**
 *
 * Use to route built-in logger output to stderr while keeping stdout reserved
 * for protocol messages or data output.
 *
 * **Details**
 *
 * The reference defaults to `false`. Providing `true` makes the affected
 * loggers call `console.error` instead of `console.log`.
 *
 * @see {@link defaultLogger} for the runtime logger affected by this reference
 * @see {@link consolePretty} for the TTY-mode pretty console logger affected by this reference
 * @see {@link withConsoleError} for routing a specific formatter logger to `console.error`
 *
 * @category references
 * @since 4.0.0
 */
export const LogToStderr: Context.Reference<boolean> = effect.LogToStderr

/**
 * Transforms the output of a `Logger` using the provided function.
 *
 * **When to use**
 *
 * Use when an existing logger's output should be transformed without recreating the
 * logging logic.
 *
 * **Example** (Transforming logger output)
 *
 * ```ts import.meta.vitest
 * import { Effect, Logger } from "effect"
 *
 * const messageCounts: Array<number> = []
 * const logger = Logger.make(({ message }) => Array.isArray(message) ? message : [message]).pipe(
 *   Logger.map((messages) => messages.length),
 *   Logger.map((count) => {
 *     messageCounts.push(count)
 *   })
 * )
 *
 * Effect.runSync(Effect.log("first", "second").pipe(Effect.provide(Logger.layer([logger]))))
 * messageCounts // => [2]
 * ```
 *
 * @category mapping
 * @since 2.0.0
 */
export const map = dual<
  <Output, Output2>(
    f: (output: Output) => Output2
  ) => <Message>(
    self: Logger<Message, Output>
  ) => Logger<Message, Output2>,
  <Message, Output, Output2>(
    self: Logger<Message, Output>,
    f: (output: Output) => Output2
  ) => Logger<Message, Output2>
>(2, (self, f) => effect.loggerMake((options) => f(self.log(options))))

/**
 * Returns a new `Logger` that writes all output of the specified `Logger` to
 * the console using `console.log`.
 *
 * **When to use**
 *
 * Use when a logger's string or object output should be routed to `console.log` for
 * development or debugging.
 *
 * @category logging
 * @since 2.0.0
 */
export const withConsoleLog = <Message, Output>(
  self: Logger<Message, Output>
): Logger<Message, void> =>
  effect.loggerMake((options) => {
    const console = options.fiber.getRef(effect.ConsoleRef)
    return console.log(self.log(options))
  })
/**
 * Returns a new `Logger` that writes all output of the specified `Logger` to
 * the console using `console.error`.
 *
 * **When to use**
 *
 * Use when logger output should be routed to `console.error`, such as error logs that
 * should appear on stderr instead of stdout.
 *
 * @category logging
 * @since 2.0.0
 */
export const withConsoleError = <Message, Output>(
  self: Logger<Message, Output>
): Logger<Message, void> =>
  effect.loggerMake((options) => {
    const console = options.fiber.getRef(effect.ConsoleRef)
    return console.error(self.log(options))
  })
/**
 * Returns a new `Logger` that writes all output of the specified `Logger` to
 * the console.
 *
 * **Details**
 *
 * Will use the appropriate console method (i.e. `console.log`, `console.error`,
 * etc.) based upon the current `LogLevel`.
 *
 * `Debug` uses `console.debug`, `Info` uses `console.info`, `Trace` uses
 * `console.trace`, `Warn` uses `console.warn`, `Error` and `Fatal` use
 * `console.error`, and all other levels use `console.log`.
 *
 * @category logging
 * @since 3.8.0
 */
export const withLeveledConsole = <Message, Output>(
  self: Logger<Message, Output>
): Logger<Message, void> =>
  effect.loggerMake((options) => {
    const console = options.fiber.getRef(effect.ConsoleRef)
    const output = self.log(options)
    switch (options.logLevel) {
      case "Debug":
        return console.debug(output)
      case "Info":
        return console.info(output)
      case "Trace":
        return console.trace(output)
      case "Warn":
        return console.warn(output)
      case "Error":
      case "Fatal":
        return console.error(output)
      default:
        return console.log(output)
    }
  })

/**
 * Match strings that do not contain any whitespace characters, double quotes,
 * or equal signs.
 */
const textOnly = /^[^\s"=]*$/

/**
 * Escapes double quotes in a string.
 */
const escapeDoubleQuotes = (s: string) => `"${s.replace(/\\([\s\S])|(")/g, "\\$1$2")}"`

/**
 * Formats the identifier of a `Fiber` by prefixing it with a hash tag.
 */
const formatFiberId = (fiberId: number) => `#${fiberId}`

/**
 * Used by both {@link formatSimple} and {@link formatLogFmt} to render a log
 * message.
 *
 * @internal
 */
const format = (
  quoteValue: (s: string) => string,
  space?: number | string | undefined
) =>
({ cause, date, fiber, logLevel, message }: Options<unknown>): string => {
  const formatUnknown = (value: unknown): string =>
    typeof value === "string" ? value : Formatter.format(value, { space })
  const formatValue = (value: string): string => value.match(textOnly) ? value : quoteValue(value)
  const format = (label: string, value: string): string => `${effect.formatLabel(label)}=${formatValue(value)}`
  const append = (label: string, value: string): string => " " + format(label, value)

  let out = format("timestamp", date.toISOString())
  out += append("level", logLevel)
  out += append("fiber", formatFiberId(fiber.id))

  const messages = Array.ensure(message)
  for (let i = 0; i < messages.length; i++) {
    out += append("message", formatUnknown(messages[i]))
  }

  if (cause.reasons.length > 0) {
    out += append("cause", effect.causePretty(cause))
  }

  const now = date.getTime()
  const spans = fiber.getRef(CurrentLogSpans)
  for (const span of spans) {
    out += " " + effect.formatLogSpan(span, now)
  }

  const annotations = fiber.getRef(CurrentLogAnnotations)
  for (const [label, value] of Object.entries(annotations)) {
    out += append(label, formatUnknown(value))
  }

  return out
}

/**
 * Creates a new `Logger` from a log function.
 *
 * **Details**
 *
 * The log function receives an options object containing the message, log level,
 * cause, fiber information, and timestamp, and should return the desired output.
 *
 * @category constructors
 * @since 2.0.0
 */
export const make: <Message, Output>(
  log: (options: Options<Message>) => Output
) => Logger<Message, Output> = effect.loggerMake

/**
 * The default logging implementation used by the Effect runtime.
 *
 * @category constructors
 * @since 2.0.0
 */
export const defaultLogger: Logger<unknown, void> = effect.defaultLogger

/**
 * A `Logger` which outputs logs as a string.
 *
 * **Details**
 *
 * For example, a simple log entry is rendered as
 * `timestamp=2025-01-03T14:22:47.570Z level=INFO fiber=#1 message=hello`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const formatSimple = effect.loggerMake(format(escapeDoubleQuotes))

/**
 * A `Logger` which outputs logs using the [logfmt](https://brandur.org/logfmt)
 * style.
 *
 * **Details**
 *
 * For example, a logfmt entry is rendered as
 * `timestamp=2025-01-03T14:22:47.570Z level=INFO fiber=#1 message=hello`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const formatLogFmt = effect.loggerMake(format(JSON.stringify, 0))

/**
 * A `Logger` which outputs logs using a structured format.
 *
 * **Details**
 *
 * For example, a structured entry can contain `message: [ "hello" ]`,
 * `level: "INFO"`, `timestamp: "2025-01-03T14:25:39.666Z"`,
 * `annotations: { key: "value" }`, `spans: { label: 0 }`, and
 * `fiberId: "#1"`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const formatStructured: Logger<unknown, {
  readonly level: string
  readonly fiberId: string
  readonly timestamp: string
  readonly message: unknown
  readonly cause: string | undefined
  readonly annotations: Record<string, unknown>
  readonly spans: Record<string, number>
}> = effect.loggerMake(({ cause, date, fiber, logLevel, message }) => {
  const annotationsObj: Record<string, unknown> = {}
  const spansObj: Record<string, number> = {}

  const annotations = fiber.getRef(CurrentLogAnnotations)
  for (const [key, value] of Object.entries(annotations)) {
    InternalRecord.assignProperty(annotationsObj, key, effect.structuredMessage(value))
  }

  const now = date.getTime()
  const spans = fiber.getRef(CurrentLogSpans)
  for (const [label, timestamp] of spans) {
    InternalRecord.assignProperty(spansObj, label, now - timestamp)
  }

  const messageArr = Array.ensure(message)
  return {
    message: messageArr.length === 1
      ? effect.structuredMessage(messageArr[0])
      : messageArr.map(effect.structuredMessage),
    level: logLevel.toUpperCase(),
    timestamp: date.toISOString(),
    cause: cause.reasons.length > 0 ? effect.causePretty(cause) : undefined,
    annotations: annotationsObj,
    spans: spansObj,
    fiberId: formatFiberId(fiber.id)
  }
})

/**
 * A `Logger` which outputs logs using a structured format serialized as JSON
 * on a single line.
 *
 * **Details**
 *
 * For example, a JSON entry can render as `{"message":["hello"],"level":"INFO",
 * "timestamp":"2025-01-03T14:28:57.508Z","annotations":{"key":"value"},
 * "spans":{"label":0},"fiberId":"#1"}`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const formatJson = map(formatStructured, Formatter.formatJson)

/**
 * Creates a scoped logger that batches the output of another logger.
 *
 * **Details**
 *
 * The returned effect starts a scoped background process that periodically
 * passes buffered outputs to `flush`. When the scope closes, the background
 * process is interrupted and any remaining buffered entries are flushed.
 *
 * **Example** (Flushing buffered output on scope close)
 *
 * ```ts import.meta.vitest
 * import { Effect, Logger } from "effect"
 *
 * const flushed: Array<ReadonlyArray<string>> = []
 * const messageLogger = Logger.make((options) => String(options.message))
 * const batchedLogger = Logger.batched(messageLogger, {
 *   window: "1 hour",
 *   flush: (messages) =>
 *     Effect.sync(() => {
 *       flushed.push(messages)
 *     })
 * })
 *
 * const program = Effect.scoped(Effect.gen(function*() {
 *   const logger = yield* batchedLogger
 *   yield* Effect.log("Event 1").pipe(Effect.provide(Logger.layer([logger])))
 *   yield* Effect.log("Event 2").pipe(Effect.provide(Logger.layer([logger])))
 * }))
 * await Effect.runPromise(program)
 * flushed // => [["Event 1", "Event 2"]]
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const batched = dual<
  <Output>(options: {
    readonly window: Duration.Input
    readonly flush: (messages: Array<NoInfer<Output>>) => Effect.Effect<void>
  }) => <Message>(
    self: Logger<Message, Output>
  ) => Effect.Effect<Logger<Message, void>, never, Scope.Scope>,
  <Message, Output>(
    self: Logger<Message, Output>,
    options: {
      readonly window: Duration.Input
      readonly flush: (messages: Array<NoInfer<Output>>) => Effect.Effect<void>
    }
  ) => Effect.Effect<Logger<Message, void>, never, Scope.Scope>
>(2, <Message, Output>(
  self: Logger<Message, Output>,
  options: {
    readonly window: Duration.Input
    readonly flush: (messages: Array<NoInfer<Output>>) => Effect.Effect<void>
  }
): Effect.Effect<Logger<Message, void>, never, Scope.Scope> =>
  effect.flatMap(effect.scope, (scope) => {
    let buffer: Array<Output> = []
    const flush = effect.suspend(() => {
      if (buffer.length === 0) {
        return effect.void
      }
      const arr = buffer
      buffer = []
      return options.flush(arr)
    })

    return effect.uninterruptibleMask((restore) =>
      restore(
        effect.sleep(options.window).pipe(
          effect.andThen(flush),
          effect.forever
        )
      ).pipe(
        effect.forkDetach,
        effect.flatMap((fiber) => effect.scopeAddFinalizerExit(scope, () => effect.fiberInterrupt(fiber))),
        effect.andThen(effect.addFinalizer(() => flush)),
        effect.as(
          effect.loggerMake((options) => {
            buffer.push(self.log(options))
          })
        )
      )
    )
  }))

/**
 * A `Logger` which outputs logs in a "pretty" format and writes them to the
 * console.
 *
 * **Details**
 *
 * For example, pretty output can render as
 * `[09:37:17.579] INFO (#1) label=0ms: hello` followed by an annotation line
 * such as `key: value`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const consolePretty: (
  options?: {
    readonly colors?: "auto" | boolean | undefined
    readonly stderr?: boolean | undefined
    readonly formatDate?: ((date: Date) => string) | undefined
    readonly mode?: "browser" | "tty" | "auto" | undefined
  }
) => Logger<unknown, void> = effect.consolePretty

/**
 * A `Logger` which outputs logs using the [logfmt](https://brandur.org/logfmt)
 * style and writes them to the console.
 *
 * **Details**
 *
 * For example, a console logfmt entry is rendered as
 * `timestamp=2025-01-03T14:22:47.570Z level=INFO fiber=#1 message=info`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const consoleLogFmt: Logger<unknown, void> = withConsoleLog(formatLogFmt)

/**
 * A `Logger` which outputs logs using a structured format and writes them to
 * the console.
 *
 * **Details**
 *
 * For example, console structured output can contain
 * `message: [ "info", "message" ]`, `level: "INFO"`,
 * `timestamp: "2025-01-03T14:25:39.666Z"`,
 * `annotations: { key: "value" }`, `spans: { label: 0 }`, and
 * `fiberId: "#1"`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const consoleStructured: Logger<unknown, void> = withConsoleLog(formatStructured)

/**
 * A `Logger` which outputs logs using a structured format serialized as JSON
 * on a single line and writes them to the console.
 *
 * **Details**
 *
 * For example, console JSON output can render as
 * `{"message":["hello"],"level":"INFO","timestamp":"2025-01-03T14:28:57.508Z",
 * "annotations":{"key":"value"},"spans":{"label":0},"fiberId":"#1"}`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const consoleJson: Logger<unknown, void> = withConsoleLog(formatJson)

/**
 * A `Logger` which includes log messages as tracer span events.
 *
 * **Details**
 *
 * This logger integrates logging with distributed tracing by recording
 * all log messages as events on the current trace span, making them visible
 * in tracing tools like OpenTelemetry, Jaeger, or Zipkin.
 *
 * This logger is included in the default set of loggers for all Effect programs,
 * so log messages automatically appear as span events unless you override the
 * default loggers.
 *
 * @category constructors
 * @since 2.0.0
 */
export const tracerLogger: Logger<unknown, void> = effect.tracerLogger

/**
 * Creates a `Layer` which will overwrite the current set of loggers with the
 * specified array of `loggers`.
 *
 * **Details**
 *
 * If the specified array of `loggers` should be _merged_ with the current set
 * of loggers (instead of overwriting them), set `mergeWithExisting` to `true`.
 *
 * **Example** (Merging with active loggers)
 *
 * ```ts import.meta.vitest
 * import { Effect, Logger } from "effect"
 *
 * const firstMessages: Array<unknown> = []
 * const secondMessages: Array<unknown> = []
 * const firstLogger = Logger.make(({ message }) => {
 *   firstMessages.push(message)
 * })
 * const secondLogger = Logger.make(({ message }) => {
 *   secondMessages.push(message)
 * })
 *
 * const program = Effect.log("merged").pipe(
 *   Effect.provide(Logger.layer([secondLogger], { mergeWithExisting: true })),
 *   Effect.provide(Logger.layer([firstLogger]))
 * )
 * Effect.runSync(program)
 * firstMessages // => [["merged"]]
 * secondMessages // => [["merged"]]
 * ```
 *
 * @category context
 * @since 4.0.0
 */
export const layer = <
  const Loggers extends ReadonlyArray<Logger<unknown, unknown> | Effect.Effect<Logger<unknown, unknown>, any, any>>
>(
  loggers: Loggers,
  options?: { readonly mergeWithExisting?: boolean | undefined } | undefined
): Layer.Layer<
  never,
  Loggers extends readonly [] ? never : Effect.Error<Loggers[number]>,
  Exclude<
    Loggers extends readonly [] ? never : Effect.Services<Loggers[number]>,
    Scope.Scope
  >
> =>
  Layer.effect(
    CurrentLoggers,
    withFiber(effect.fnUntraced(function*(fiber) {
      const currentLoggers = new Set(options?.mergeWithExisting === true ? fiber.getRef(effect.CurrentLoggers) : [])
      for (const logger of loggers) {
        currentLoggers.add(isEffect(logger) ? yield* logger : logger)
      }
      return currentLoggers
    }))
  )

/**
 * Creates a scoped logger that writes string logger output to a file.
 *
 * **Details**
 *
 * The returned effect requires `FileSystem` and `Scope`. The file logger batches
 * string output, writes each batch to the specified path, and flushes remaining
 * entries when the scope closes.
 *
 * **Gotchas**
 *
 * Opening the file can fail, but errors from writing a batch after the file is
 * open are ignored.
 *
 * @category file
 * @since 4.0.0
 */
export const toFile = dual<
  (
    path: string,
    options?: {
      readonly flag?: FileSystem.OpenFlag | undefined
      readonly mode?: number | undefined
      readonly batchWindow?: Duration.Input | undefined
    } | undefined
  ) => <Message>(
    self: Logger<Message, string>
  ) => Effect.Effect<Logger<Message, void>, PlatformError, Scope.Scope | FileSystem.FileSystem>,
  <Message>(
    self: Logger<Message, string>,
    path: string,
    options?: {
      readonly flag?: FileSystem.OpenFlag | undefined
      readonly mode?: number | undefined
      readonly batchWindow?: Duration.Input | undefined
    } | undefined
  ) => Effect.Effect<Logger<Message, void>, PlatformError, Scope.Scope | FileSystem.FileSystem>
>(
  (args) => isLogger(args[0]),
  (self, path, options) =>
    effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const logFile = yield* fs.open(path, { flag: "a+", ...options })
      const encoder = new TextEncoder()
      return yield* batched(self, {
        window: options?.batchWindow ?? 1000,
        flush: (output) => effect.ignore(logFile.write(encoder.encode(output.join("\n") + "\n")))
      })
    })
)
