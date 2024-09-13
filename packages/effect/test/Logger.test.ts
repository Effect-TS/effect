import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as FiberId from "effect/FiberId"
import * as FiberRefs from "effect/FiberRefs"
import { identity } from "effect/Function"
import * as HashMap from "effect/HashMap"
import { logLevelInfo } from "effect/internal/core"
import * as List from "effect/List"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as LogSpan from "effect/LogSpan"
import { assert, describe, expect, it } from "effect/test/utils/extend"
import { afterEach, beforeEach, vi } from "vitest"

describe("Logger", () => {
  it("isLogger", () => {
    expect(Logger.isLogger(Logger.stringLogger)).toBeTruthy()
    expect(Logger.isLogger(Logger.logfmtLogger)).toBeTruthy()
    expect(Logger.isLogger({})).toBeFalsy()
    expect(Logger.isLogger(null)).toBeFalsy()
    expect(Logger.isLogger(undefined)).toBeFalsy()
  })
})

describe("withLeveledConsole", () => {
  it.effect("calls the respsective Console functions on a given level", () =>
    Effect.gen(function*() {
      const c = yield* Effect.console
      const logs: Array<{ level: string; value: unknown }> = []
      const pusher = (level: string) => (value: unknown) => {
        logs.push({ level, value })
      }
      const newConsole: typeof c = {
        ...c,
        unsafe: {
          ...c.unsafe,
          log: pusher("log"),
          warn: pusher("warn"),
          error: pusher("error"),
          info: pusher("info"),
          debug: pusher("debug"),
          trace: pusher("trace")
        }
      }

      const logger = Logger.make((o) => String(o.message)).pipe(Logger.withLeveledConsole)
      yield* Effect.gen(function*() {
        yield* Effect.log("log plain")
        yield* Effect.logInfo("log info")
        yield* Effect.logWarning("log warn")
        yield* Effect.logError("log err")
        yield* Effect.logFatal("log fatal")
        yield* Effect.logDebug("log debug")
        yield* Effect.logTrace("log trace")
      }).pipe(
        Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
        Logger.withMinimumLogLevel(LogLevel.Trace),
        Effect.withConsole(newConsole)
      )

      expect(logs).toEqual([
        { level: "info", value: "log plain" },
        { level: "info", value: "log info" },
        { level: "warn", value: "log warn" },
        { level: "error", value: "log err" },
        { level: "error", value: "log fatal" },
        { level: "debug", value: "log debug" },
        { level: "trace", value: "log trace" }
      ])
    }))
})

describe("stringLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keys with special chars", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = List.make(LogSpan.make("imma span=\"", date.getTime() - 7))
    const annotations = HashMap.make(
      ["just_a_key", "just_a_value"],
      ["I am bad key name", { coolValue: "cool value" }],
      ["good_key", "I am a good value"],
      ["good_bool", true],
      ["good_number", 123]
    )

    const result = Logger.stringLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: "My message",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans,
      annotations,
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="My message" imma_span__=7ms just_a_key=just_a_value good_key="I am a good value" good_bool=true I_am_bad_key_name="{
  \\"coolValue\\": \\"cool value\\"
}" good_number=123`
    )
  })

  it("with linebreaks", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = List.make(LogSpan.make("imma\nspan=\"", date.getTime() - 7))
    const annotations = HashMap.make(
      ["I am also\na bad key name", { return: "cool\nvalue" }],
      ["good_key", { returnWithSpace: "cool\nvalue or not" }],
      ["good_key2", "I am a good value\nwith line breaks"],
      ["good_key3", "I_have=a"]
    )

    const result = Logger.stringLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: "My\nmessage",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans,
      annotations,
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="My
message" imma_span__=7ms I_am_also_a_bad_key_name="{
  \\"return\\": \\"cool\\nvalue\\"
}" good_key="{
  \\"returnWithSpace\\": \\"cool\\nvalue or not\\"
}" good_key2="I am a good value
with line breaks" good_key3="I_have=a"`
    )
  })

  it("multiple messages", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.stringLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: ["a", "b", "c"],
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message=a message=b message=c`
    )
  })
})

describe("logfmtLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keys with special chars", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = List.make(LogSpan.make("imma span=\"", date.getTime() - 7))
    const annotations = HashMap.make(
      ["just_a_key", "just_a_value"],
      ["I am bad key name", { coolValue: "cool value" }],
      ["good_key", "I am a good value"]
    )

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: "My message",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans,
      annotations,
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="My message" imma_span__=7ms just_a_key=just_a_value good_key="I am a good value" I_am_bad_key_name="{\\"coolValue\\":\\"cool value\\"}"`
    )
  })

  it("with linebreaks", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = List.make(LogSpan.make("imma\nspan=\"", date.getTime() - 7))
    const annotations = HashMap.make(
      ["I am also\na bad key name", { return: "cool\nvalue" }],
      ["good_key", { returnWithSpace: "cool\nvalue or not" }],
      ["good_key2", "I am a good value\nwith line breaks"],
      ["good_key3", "I_have=a"],
      ["good_bool", true],
      ["good_number", 123]
    )

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: "My\nmessage",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans,
      annotations,
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="My\\nmessage" imma_span__=7ms I_am_also_a_bad_key_name="{\\"return\\":\\"cool\\\\nvalue\\"}" good_key="{\\"returnWithSpace\\":\\"cool\\\\nvalue or not\\"}" good_bool=true good_number=123 good_key2="I am a good value\\nwith line breaks" good_key3="I_have=a"`
    )
  })

  it(".pipe", () => {
    expect(Logger.stringLogger.pipe(identity)).toBe(Logger.stringLogger)
    expect(logLevelInfo.pipe(identity)).toBe(logLevelInfo)
  })

  it("objects", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: { hello: "world" },
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="{\\"hello\\":\\"world\\"}"`
    )
  })

  it("circular objects", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const msg: Record<string, any> = { hello: "world" }
    msg.msg = msg

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: msg,
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="{\\"hello\\":\\"world\\"}"`
    )
  })

  it("symbols", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: Symbol.for("effect/Logger/test"),
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message=Symbol(effect/Logger/test)`
    )
  })

  it("functions", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: () => "hello world",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="() => \\"hello world\\""`
    )
  })

  it("annotations", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const annotations = HashMap.make(["hashmap", HashMap.make(["key", 2])], ["chunk", Chunk.make(1, 2)])

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: "hello world",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations,
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="hello world" hashmap="{\\"_id\\":\\"HashMap\\",\\"values\\":[[\\"key\\",2]]}" chunk="{\\"_id\\":\\"Chunk\\",\\"values\\":[1,2]}"`
    )
  })

  it("batched", () =>
    Effect.gen(function*(_) {
      const chunks: Array<Array<string>> = []
      const date = new Date()
      vi.setSystemTime(date)
      const logger = yield* _(
        Logger.logfmtLogger,
        Logger.batched("100 millis", (_) =>
          Effect.sync(() => {
            chunks.push(_)
          }))
      )
      const log = (message: string) =>
        logger.log({
          fiberId: FiberId.none,
          logLevel: logLevelInfo,
          message,
          cause: Cause.empty,
          context: FiberRefs.unsafeMake(new Map()),
          spans: List.empty(),
          annotations: HashMap.empty(),
          date
        })

      log("a")
      log("b")
      log("c")
      yield* _(Effect.promise(() => vi.advanceTimersByTimeAsync(100)))
      log("d")
      log("e")
      yield* _(Effect.promise(() => vi.advanceTimersByTimeAsync(100)))

      assert.deepStrictEqual(chunks, [
        [
          `timestamp=${date.toISOString()} level=INFO fiber= message=a`,
          `timestamp=${date.toISOString()} level=INFO fiber= message=b`,
          `timestamp=${date.toISOString()} level=INFO fiber= message=c`
        ],
        [
          `timestamp=${date.toISOString()} level=INFO fiber= message=d`,
          `timestamp=${date.toISOString()} level=INFO fiber= message=e`
        ]
      ])
    }).pipe(Effect.scoped, Effect.runPromise))

  it("multiple messages", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.logfmtLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: ["a", "b", "c"],
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message=a message=b message=c`
    )
  })
})

describe("jsonLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keys with special chars", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = List.make(LogSpan.make("imma span=\"", date.getTime() - 7))
    const annotations = HashMap.make(
      ["just_a_key", "just_a_value"],
      ["I am bad key name", { coolValue: "cool value" }],
      ["good_key", "I am a good value"],
      ["good_bool", true],
      ["good_number", 123]
    )

    const result = Logger.jsonLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: "My message",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans,
      annotations,
      date
    })

    expect(result).toEqual(
      JSON.stringify({
        message: "My message",
        logLevel: "INFO",
        timestamp: date.toJSON(),
        annotations: {
          just_a_key: "just_a_value",
          good_key: "I am a good value",
          good_bool: true,
          "I am bad key name": { coolValue: "cool value" },
          good_number: 123
        },
        spans: { "imma span=\"": 7 },
        fiberId: ""
      })
    )
  })

  it("objects", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.jsonLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: { hello: "world" },
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(JSON.stringify({
      message: { hello: "world" },
      logLevel: "INFO",
      timestamp: date.toJSON(),
      annotations: {},
      spans: {},
      fiberId: ""
    }))
  })

  it("circular objects", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const msg: Record<string, any> = { hello: "world" }
    msg.msg = msg

    const result = Logger.jsonLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: msg,
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(JSON.stringify({
      message: { hello: "world" },
      logLevel: "INFO",
      timestamp: date.toJSON(),
      annotations: {},
      spans: {},
      fiberId: ""
    }))
  })

  it("symbols", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.jsonLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: Symbol.for("effect/Logger/test"),
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(JSON.stringify({
      message: Symbol.for("effect/Logger/test").toString(),
      logLevel: "INFO",
      timestamp: date.toJSON(),
      annotations: {},
      spans: {},
      fiberId: ""
    }))
  })

  it("functions", () => {
    const date = new Date()
    vi.setSystemTime(date)

    const result = Logger.jsonLogger.log({
      fiberId: FiberId.none,
      logLevel: logLevelInfo,
      message: () => "hello world",
      cause: Cause.empty,
      context: FiberRefs.unsafeMake(new Map()),
      spans: List.empty(),
      annotations: HashMap.empty(),
      date
    })

    expect(result).toEqual(JSON.stringify({
      message: "() => \"hello world\"",
      logLevel: "INFO",
      timestamp: date.toJSON(),
      annotations: {},
      spans: {},
      fiberId: ""
    }))
  })
})
