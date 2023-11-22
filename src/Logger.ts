/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type { Effect } from "./Effect.js"
import type * as FiberId from "./FiberId.js"
import type * as FiberRefs from "./FiberRefs.js"
import type { LazyArg } from "./Function.js"
import type * as HashMap from "./HashMap.js"
import * as fiberRuntime from "./internal/fiberRuntime.js"
import * as circular from "./internal/layer/circular.js"
import * as internalCircular from "./internal/logger-circular.js"
import * as internal from "./internal/logger.js"
import type * as Layer from "./Layer.js"
import type * as List from "./List.js"
import type * as LogLevel from "./LogLevel.js"
import type * as LogSpan from "./LogSpan.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Scope } from "./Scope.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const LoggerTypeId: unique symbol = internal.LoggerTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type LoggerTypeId = typeof LoggerTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Logger<in Message, out Output> extends Logger.Variance<Message, Output>, Pipeable {
  log(options: Logger.Options<Message>): Output
}

/**
 * @since 2.0.0
 */
export declare namespace Logger {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in Message, out Output> {
    readonly [LoggerTypeId]: {
      readonly _Message: Types.Contravariant<Message>
      readonly _Output: Types.Covariant<Output>
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Options<out Message> {
    readonly fiberId: FiberId.FiberId
    readonly logLevel: LogLevel.LogLevel
    readonly message: Message
    readonly cause: Cause.Cause<unknown>
    readonly context: FiberRefs.FiberRefs
    readonly spans: List.List<LogSpan.LogSpan>
    readonly annotations: HashMap.HashMap<string, unknown>
    readonly date: Date
  }
}

/**
 * @category constructors
 * @since 2.0.0
 */
export const make: <Message, Output>(log: (options: Logger.Options<Message>) => Output) => Logger<Message, Output> =
  internal.makeLogger

/**
 * @since 2.0.0
 * @category context
 */
export const add: <B>(logger: Logger<unknown, B>) => Layer.Layer<never, never, never> = circular.addLogger

/**
 * @since 2.0.0
 * @category context
 */
export const addEffect: <R, E, A>(effect: Effect<R, E, Logger<unknown, A>>) => Layer.Layer<R, E, never> =
  circular.addLoggerEffect

/**
 * @since 2.0.0
 * @category context
 */
export const addScoped: <R, E, A>(
  effect: Effect<R, E, Logger<unknown, A>>
) => Layer.Layer<Exclude<R, Scope>, E, never> = circular.addLoggerScoped

/**
 * @since 2.0.0
 * @category mapping
 */
export const mapInput: {
  <Message, Message2>(
    f: (message: Message2) => Message
  ): <Output>(self: Logger<Message, Output>) => Logger<Message2, Output>
  <Output, Message, Message2>(
    self: Logger<Message, Output>,
    f: (message: Message2) => Message
  ): Logger<Message2, Output>
} = internal.mapInput

/**
 * @since 2.0.0
 * @category mapping
 */
export const mapInputOptions: {
  <Message, Message2>(
    f: (options: Logger.Options<Message2>) => Logger.Options<Message>
  ): <Output>(self: Logger<Message, Output>) => Logger<Message2, Output>
  <Output, Message, Message2>(
    self: Logger<Message, Output>,
    f: (options: Logger.Options<Message2>) => Logger.Options<Message>
  ): Logger<Message2, Output>
} = internal.mapInputOptions

/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterLogLevel: {
  (
    f: (logLevel: LogLevel.LogLevel) => boolean
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message, Option.Option<Output>>
  <Message, Output>(
    self: Logger<Message, Output>,
    f: (logLevel: LogLevel.LogLevel) => boolean
  ): Logger<Message, Option.Option<Output>>
} = internal.filterLogLevel

/**
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <Output, Output2>(
    f: (output: Output) => Output2
  ): <Message>(self: Logger<Message, Output>) => Logger<Message, Output2>
  <Message, Output, Output2>(
    self: Logger<Message, Output>,
    f: (output: Output) => Output2
  ): Logger<Message, Output2>
} = internal.map

/**
 * A logger that does nothing in response to logging events.
 *
 * @since 2.0.0
 * @category constructors
 */
export const none: Logger<unknown, void> = internal.none

/**
 * @since 2.0.0
 * @category context
 */
export const remove: <A>(logger: Logger<unknown, A>) => Layer.Layer<never, never, never> = circular.removeLogger

/**
 * @since 2.0.0
 * @category context
 */
export const replace: {
  <B>(that: Logger<unknown, B>): <A>(self: Logger<unknown, A>) => Layer.Layer<never, never, never>
  <A, B>(self: Logger<unknown, A>, that: Logger<unknown, B>): Layer.Layer<never, never, never>
} = circular.replaceLogger

/**
 * @since 2.0.0
 * @category context
 */
export const replaceEffect: {
  <R, E, B>(that: Effect<R, E, Logger<unknown, B>>): <A>(self: Logger<unknown, A>) => Layer.Layer<R, E, never>
  <A, R, E, B>(self: Logger<unknown, A>, that: Effect<R, E, Logger<unknown, B>>): Layer.Layer<R, E, never>
} = circular.replaceLoggerEffect

/**
 * @since 2.0.0
 * @category context
 */
export const replaceScoped: {
  <R, E, B>(
    that: Effect<R, E, Logger<unknown, B>>
  ): <A>(self: Logger<unknown, A>) => Layer.Layer<Exclude<R, Scope>, E, never>
  <A, R, E, B>(
    self: Logger<unknown, A>,
    that: Effect<R, E, Logger<unknown, B>>
  ): Layer.Layer<Exclude<R, Scope>, E, never>
} = circular.replaceLoggerScoped

/**
 * @since 2.0.0
 * @category constructors
 */
export const simple: <A, B>(log: (a: A) => B) => Logger<A, B> = internal.simple

/**
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Logger<unknown, A> = internal.succeed

/**
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: LazyArg<A>) => Logger<unknown, A> = internal.sync

/**
 * @since 2.0.0
 * @category constructors
 */
export const test: {
  <Message>(input: Message): <Output>(self: Logger<Message, Output>) => Output
  <Message, Output>(self: Logger<Message, Output>, input: Message): Output
} = internalCircular.test

/**
 * @since 2.0.0
 * @category context
 */
export const withMinimumLogLevel: {
  (level: LogLevel.LogLevel): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, level: LogLevel.LogLevel): Effect<R, E, A>
} = circular.withMinimumLogLevel

/**
 * @since 2.0.0
 * @category tracing
 */
export const withSpanAnnotations: <Message, Output>(self: Logger<Message, Output>) => Logger<Message, Output> =
  fiberRuntime.loggerWithSpanAnnotations

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <Message2, Output2>(
    that: Logger<Message2, Output2>
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, [Output, Output2]>
  <Message, Output, Message2, Output2>(
    self: Logger<Message, Output>,
    that: Logger<Message2, Output2>
  ): Logger<Message & Message2, [Output, Output2]>
} = internal.zip

/**
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <Message2, Output2>(
    that: Logger<Message2, Output2>
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output>
  <Message, Output, Message2, Output2>(
    self: Logger<Message, Output>,
    that: Logger<Message2, Output2>
  ): Logger<Message & Message2, Output>
} = internal.zipLeft

/**
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <Message2, Output2>(
    that: Logger<Message2, Output2>
  ): <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output2>
  <Message, Output, Message2, Output2>(
    self: Logger<Message, Output>,
    that: Logger<Message2, Output2>
  ): Logger<Message & Message2, Output2>
} = internal.zipRight

/**
 * @since 2.0.0
 * @category constructors
 */
export const defaultLogger: Logger<unknown, void> = fiberRuntime.defaultLogger

/**
 * @since 2.0.0
 * @category constructors
 */
export const logfmtLogger: Logger<unknown, string> = internal.logfmtLogger

/**
 * @since 2.0.0
 * @category constructors
 */
export const stringLogger: Logger<unknown, string> = internal.stringLogger

/**
 * @since 2.0.0
 * @category constructors
 */
export const tracerLogger: Logger<unknown, void> = fiberRuntime.tracerLogger

/**
 * @since 2.0.0
 * @category constructors
 */
export const logFmt: Layer.Layer<never, never, never> = replace(fiberRuntime.defaultLogger, fiberRuntime.logFmtLogger)

/**
 * @since 2.0.0
 * @category context
 */
export const minimumLogLevel: (level: LogLevel.LogLevel) => Layer.Layer<never, never, never> = circular.minimumLogLevel
