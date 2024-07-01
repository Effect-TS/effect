import * as Arr from "../Array.js"
import type { LazyArg } from "../Function.js"
import { constVoid, dual, pipe } from "../Function.js"
import * as HashMap from "../HashMap.js"
import * as Inspectable from "../Inspectable.js"
import * as List from "../List.js"
import type * as Logger from "../Logger.js"
import type * as LogLevel from "../LogLevel.js"
import * as LogSpan from "../LogSpan.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as Cause from "./cause.js"
import * as _fiberId from "./fiberId.js"

/** @internal */
const LoggerSymbolKey = "effect/Logger"

/** @internal */
export const LoggerTypeId: Logger.LoggerTypeId = Symbol.for(
  LoggerSymbolKey
) as Logger.LoggerTypeId

const loggerVariance = {
  /* c8 ignore next */
  _Message: (_: unknown) => _,
  /* c8 ignore next */
  _Output: (_: never) => _
}

/** @internal */
export const makeLogger = <Message, Output>(
  log: (options: Logger.Logger.Options<Message>) => Output
): Logger.Logger<Message, Output> => ({
  [LoggerTypeId]: loggerVariance,
  log,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/** @internal */
export const mapInput = dual<
  <Message, Message2>(
    f: (message: Message2) => Message
  ) => <Output>(self: Logger.Logger<Message, Output>) => Logger.Logger<Message2, Output>,
  <Output, Message, Message2>(
    self: Logger.Logger<Message, Output>,
    f: (message: Message2) => Message
  ) => Logger.Logger<Message2, Output>
>(2, (self, f) =>
  makeLogger(
    (options) => self.log({ ...options, message: f(options.message) })
  ))

/** @internal */
export const mapInputOptions = dual<
  <Message, Message2>(
    f: (options: Logger.Logger.Options<Message2>) => Logger.Logger.Options<Message>
  ) => <Output>(self: Logger.Logger<Message, Output>) => Logger.Logger<Message2, Output>,
  <Output, Message, Message2>(
    self: Logger.Logger<Message, Output>,
    f: (options: Logger.Logger.Options<Message2>) => Logger.Logger.Options<Message>
  ) => Logger.Logger<Message2, Output>
>(2, (self, f) => makeLogger((options) => self.log(f(options))))

/** @internal */
export const filterLogLevel = dual<
  (
    f: (logLevel: LogLevel.LogLevel) => boolean
  ) => <Message, Output>(self: Logger.Logger<Message, Output>) => Logger.Logger<Message, Option.Option<Output>>,
  <Message, Output>(
    self: Logger.Logger<Message, Output>,
    f: (logLevel: LogLevel.LogLevel) => boolean
  ) => Logger.Logger<Message, Option.Option<Output>>
>(2, (self, f) =>
  makeLogger((options) =>
    f(options.logLevel)
      ? Option.some(self.log(options))
      : Option.none()
  ))

/** @internal */
export const map = dual<
  <Output, Output2>(
    f: (output: Output) => Output2
  ) => <Message>(self: Logger.Logger<Message, Output>) => Logger.Logger<Message, Output2>,
  <Message, Output, Output2>(
    self: Logger.Logger<Message, Output>,
    f: (output: Output) => Output2
  ) => Logger.Logger<Message, Output2>
>(2, (self, f) => makeLogger((options) => f(self.log(options))))

/** @internal */
export const none: Logger.Logger<unknown, void> = {
  [LoggerTypeId]: loggerVariance,
  log: constVoid,
  pipe() {
    return pipeArguments(this, arguments)
  }
} as Logger.Logger<unknown, void>

/** @internal */
export const simple = <A, B>(log: (a: A) => B): Logger.Logger<A, B> => ({
  [LoggerTypeId]: loggerVariance,
  log: ({ message }) => log(message),
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/** @internal */
export const succeed = <A>(value: A): Logger.Logger<unknown, A> => {
  return simple(() => value)
}

/** @internal */
export const sync = <A>(evaluate: LazyArg<A>): Logger.Logger<unknown, A> => {
  return simple(evaluate)
}

/** @internal */
export const zip = dual<
  <Message2, Output2>(
    that: Logger.Logger<Message2, Output2>
  ) => <Message, Output>(
    self: Logger.Logger<Message, Output>
  ) => Logger.Logger<Message & Message2, [Output, Output2]>,
  <Message, Output, Message2, Output2>(
    self: Logger.Logger<Message, Output>,
    that: Logger.Logger<Message2, Output2>
  ) => Logger.Logger<Message & Message2, [Output, Output2]>
>(2, (self, that) => makeLogger((options) => [self.log(options), that.log(options)]))

/** @internal */
export const zipLeft = dual<
  <Message2, Output2>(
    that: Logger.Logger<Message2, Output2>
  ) => <Message, Output>(
    self: Logger.Logger<Message, Output>
  ) => Logger.Logger<Message & Message2, Output>,
  <Message, Output, Message2, Output2>(
    self: Logger.Logger<Message, Output>,
    that: Logger.Logger<Message2, Output2>
  ) => Logger.Logger<Message & Message2, Output>
>(2, (self, that) => map(zip(self, that), (tuple) => tuple[0]))

/** @internal */
export const zipRight = dual<
  <Message2, Output2>(
    that: Logger.Logger<Message2, Output2>
  ) => <Message, Output>(
    self: Logger.Logger<Message, Output>
  ) => Logger.Logger<Message & Message2, Output2>,
  <Message, Output, Message2, Output2>(
    self: Logger.Logger<Message, Output>,
    that: Logger.Logger<Message2, Output2>
  ) => Logger.Logger<Message & Message2, Output2>
>(2, (self, that) => map(zip(self, that), (tuple) => tuple[1]))

/** @internal */
export const stringLogger: Logger.Logger<unknown, string> = makeLogger(
  ({ annotations, cause, date, fiberId, logLevel, message, spans }) => {
    const nowMillis = date.getTime()

    const outputArray = [
      `timestamp=${date.toISOString()}`,
      `level=${logLevel.label}`,
      `fiber=${_fiberId.threadName(fiberId)}`
    ]

    let output = outputArray.join(" ")

    const messageArr = Arr.ensure(message)
    for (let i = 0; i < messageArr.length; i++) {
      const stringMessage = Inspectable.toStringUnknown(messageArr[i])
      if (stringMessage.length > 0) {
        output = output + " message="
        output = appendQuoted(stringMessage, output)
      }
    }

    if (cause != null && cause._tag !== "Empty") {
      output = output + " cause="
      output = appendQuoted(Cause.pretty(cause), output)
    }

    if (List.isCons(spans)) {
      output = output + " "

      let first = true
      for (const span of spans) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + pipe(span, LogSpan.render(nowMillis))
      }
    }

    if (HashMap.size(annotations) > 0) {
      output = output + " "

      let first = true
      for (const [key, value] of annotations) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + filterKeyName(key)
        output = output + "="
        output = appendQuoted(Inspectable.toStringUnknown(value), output)
      }
    }

    return output
  }
)

/** @internal */
const escapeDoubleQuotes = (str: string) => `"${str.replace(/\\([\s\S])|(")/g, "\\$1$2")}"`

const textOnly = /^[^\s"=]+$/

/** @internal */
const appendQuoted = (label: string, output: string): string =>
  output + (label.match(textOnly) ? label : escapeDoubleQuotes(label))

/** @internal */
export const logfmtLogger = makeLogger<unknown, string>(
  ({ annotations, cause, date, fiberId, logLevel, message, spans }) => {
    const nowMillis = date.getTime()

    const outputArray = [
      `timestamp=${date.toISOString()}`,
      `level=${logLevel.label}`,
      `fiber=${_fiberId.threadName(fiberId)}`
    ]

    let output = outputArray.join(" ")

    const messageArr = Arr.ensure(message)
    for (let i = 0; i < messageArr.length; i++) {
      const stringMessage = Inspectable.toStringUnknown(messageArr[i], 0)
      if (stringMessage.length > 0) {
        output = output + " message="
        output = appendQuotedLogfmt(stringMessage, output)
      }
    }

    if (cause != null && cause._tag !== "Empty") {
      output = output + " cause="
      output = appendQuotedLogfmt(Cause.pretty(cause), output)
    }

    if (List.isCons(spans)) {
      output = output + " "

      let first = true
      for (const span of spans) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + pipe(span, renderLogSpanLogfmt(nowMillis))
      }
    }

    if (HashMap.size(annotations) > 0) {
      output = output + " "

      let first = true
      for (const [key, value] of annotations) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + filterKeyName(key)
        output = output + "="
        output = appendQuotedLogfmt(Inspectable.toStringUnknown(value, 0), output)
      }
    }

    return output
  }
)

/** @internal */
export const structuredLogger = makeLogger<unknown, {
  readonly logLevel: string
  readonly fiberId: string
  readonly timestamp: string
  readonly message: unknown
  readonly cause: string | undefined
  readonly annotations: Record<string, unknown>
  readonly spans: Record<string, number>
}>(
  ({ annotations, cause, date, fiberId, logLevel, message, spans }) => {
    const now = date.getTime()
    const annotationsObj: Record<string, unknown> = {}
    const spansObj: Record<string, number> = {}

    if (HashMap.size(annotations) > 0) {
      for (const [k, v] of annotations) {
        annotationsObj[k] = structuredMessage(v)
      }
    }

    if (List.isCons(spans)) {
      for (const span of spans) {
        spansObj[span.label] = now - span.startTime
      }
    }

    const messageArr = Arr.ensure(message)
    return {
      message: messageArr.length === 1 ? structuredMessage(messageArr[0]) : messageArr.map(structuredMessage),
      logLevel: logLevel.label,
      timestamp: date.toISOString(),
      cause: Cause.isEmpty(cause) ? undefined : Cause.pretty(cause),
      annotations: annotationsObj,
      spans: spansObj,
      fiberId: _fiberId.threadName(fiberId)
    }
  }
)

export const structuredMessage = (u: unknown): unknown => {
  switch (typeof u) {
    case "bigint":
    case "function":
    case "symbol": {
      return String(u)
    }
    default: {
      return u
    }
  }
}

/** @internal */
export const jsonLogger = map(structuredLogger, Inspectable.stringifyCircular)

/** @internal */
const filterKeyName = (key: string) => key.replace(/[\s="]/g, "_")

/** @internal */
const escapeDoubleQuotesLogfmt = (str: string) => JSON.stringify(str)

/** @internal */
const appendQuotedLogfmt = (label: string, output: string): string =>
  output + (label.match(textOnly) ? label : escapeDoubleQuotesLogfmt(label))

/** @internal */
const renderLogSpanLogfmt = (now: number) => (self: LogSpan.LogSpan): string => {
  const label = filterKeyName(self.label)
  return `${label}=${now - self.startTime}ms`
}

/** @internal */
export const isLogger = (u: unknown): u is Logger.Logger<unknown, unknown> => {
  return typeof u === "object" && u != null && LoggerTypeId in u
}

const processStdoutIsTTY = typeof process === "object" && "stdout" in process && process.stdout.isTTY === true

const withColor = (text: string, ...colors: ReadonlyArray<string>) => {
  let out = ""
  for (let i = 0; i < colors.length; i++) {
    out += `\x1b[${colors[i]}m`
  }
  return out + text + "\x1b[0m"
}
const withColorNoop = (text: string, ..._colors: ReadonlyArray<string>) => text
const colors = {
  bright: "1",

  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  magenta: "35",
  cyan: "36",
  white: "37",
  gray: "90"
} as const

const logLevelColors: Record<LogLevel.LogLevel["_tag"], ReadonlyArray<string>> = {
  None: [],
  All: [],
  Trace: [colors.gray],
  Debug: [colors.blue],
  Info: [colors.green],
  Warning: [colors.yellow],
  Error: [colors.red],
  Fatal: [colors.bright, colors.red]
}

/** @internal */
export const prettyLogger = (options?: {
  readonly colors?: "auto" | boolean
}) =>
  makeLogger<unknown, string>(
    ({ annotations, cause, date, fiberId, logLevel, message: message_, spans }) => {
      const showColors = typeof options?.colors === "boolean" ? options.colors : processStdoutIsTTY
      const color = showColors ? withColor : withColorNoop

      const message = Arr.ensure(message_)

      let logMessage = color(
        `[${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${
          date.getSeconds().toString().padStart(2, "0")
        }.${date.getMilliseconds().toString().padStart(3, "0")}]`,
        colors.white
      )
        + ` ${color(logLevel.label, ...logLevelColors[logLevel._tag])} (${_fiberId.threadName(fiberId)})`

      if (List.isCons(spans)) {
        const now = date.getTime()
        const render = renderLogSpanLogfmt(now)
        for (const span of spans) {
          logMessage += " " + render(span)
        }
      }

      logMessage += ":"
      let messageIndex = 0
      if (message.length > 0) {
        const firstMaybeString = structuredMessage(message[0])
        if (typeof firstMaybeString === "string") {
          logMessage += " " + color(firstMaybeString, colors.bright, colors.cyan)
          messageIndex++
        }
      }

      logMessage += "\n"

      if (!Cause.isEmpty(cause)) {
        const lines = Cause.pretty(cause).split("\n")
        for (let i = 0; i < lines.length; i++) {
          logMessage += "  " + lines[i] + "\n"
        }
      }

      if (messageIndex < message.length) {
        for (; messageIndex < message.length; messageIndex++) {
          const lines = Inspectable.stringifyCircular(message[messageIndex], 2).split("\n")
          for (let i = 0; i < lines.length; i++) {
            logMessage += "  " + lines[i] + "\n"
          }
        }
      }

      if (HashMap.size(annotations) > 0) {
        for (const [key, value] of annotations) {
          logMessage += "  " + color(`${key}:`, colors.bright, colors.white) + " "
          const lines = Inspectable.stringifyCircular(value, 2).split("\n")
          for (let i = 0; i < lines.length; i++) {
            if (i > 0) {
              logMessage += "  "
            }
            logMessage += lines[i] + "\n"
          }
        }
      }

      return logMessage
    }
  )
