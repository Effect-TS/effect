import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as FiberId from "effect/FiberId"
import * as FiberRefs from "effect/FiberRefs"
import { identity } from "effect/Function"
import * as HashMap from "effect/HashMap"
import { logLevelInfo } from "effect/internal/core"
import * as List from "effect/List"
import * as Logger from "effect/Logger"
import * as LogSpan from "effect/LogSpan"

import { vi } from "vitest"

describe("stringLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test("keys with special chars", () => {
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
      `timestamp=${date.toJSON()} level=INFO fiber= message="My message" imma_span__=7ms just_a_key=just_a_value good_key="I am a good value" good_bool=true I_am_bad_key_name="{\\"coolValue\\":\\"cool value\\"}" good_number=123`
    )
  })

  test("with linebreaks", () => {
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
message" imma_span__=7ms I_am_also_a_bad_key_name="{\\"return\\":\\"cool\\nvalue\\"}" good_key="{\\"returnWithSpace\\":\\"cool\\nvalue or not\\"}" good_key2="I am a good value
with line breaks" good_key3="I_have=a"`
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

  test("keys with special chars", () => {
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

  test("with linebreaks", () => {
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

  test(".pipe", () => {
    expect(Logger.stringLogger.pipe(identity)).toBe(Logger.stringLogger)
    expect(logLevelInfo.pipe(identity)).toBe(logLevelInfo)
  })

  test("objects", () => {
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

  test("circular objects", () => {
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
      `timestamp=${date.toJSON()} level=INFO fiber= message="[object Object]"`
    )
  })

  test("symbols", () => {
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

  test("functions", () => {
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

  test("annotations", () => {
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
})
