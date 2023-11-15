import * as LogLevel from "effect/LogLevel"
import { describe, expect, it } from "vitest"

describe("LogLevel", () => {
  it("fromLiteral", () => {
    expect(LogLevel.fromLiteral("All")).toStrictEqual(LogLevel.All)
    expect(LogLevel.fromLiteral("Debug")).toStrictEqual(LogLevel.Debug)
    expect(LogLevel.fromLiteral("Error")).toStrictEqual(LogLevel.Error)
    expect(LogLevel.fromLiteral("Fatal")).toStrictEqual(LogLevel.Fatal)
    expect(LogLevel.fromLiteral("Info")).toStrictEqual(LogLevel.Info)
    expect(LogLevel.fromLiteral("None")).toStrictEqual(LogLevel.None)
    expect(LogLevel.fromLiteral("Trace")).toStrictEqual(LogLevel.Trace)
    expect(LogLevel.fromLiteral("Warning")).toStrictEqual(LogLevel.Warning)
  })
})
