import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { LogLevel } from "effect"

describe("LogLevel", () => {
  it("fromLiteral", () => {
    strictEqual(LogLevel.fromLiteral("All"), LogLevel.All)
    strictEqual(LogLevel.fromLiteral("Debug"), LogLevel.Debug)
    strictEqual(LogLevel.fromLiteral("Error"), LogLevel.Error)
    strictEqual(LogLevel.fromLiteral("Fatal"), LogLevel.Fatal)
    strictEqual(LogLevel.fromLiteral("Info"), LogLevel.Info)
    strictEqual(LogLevel.fromLiteral("None"), LogLevel.None)
    strictEqual(LogLevel.fromLiteral("Trace"), LogLevel.Trace)
    strictEqual(LogLevel.fromLiteral("Warning"), LogLevel.Warning)
  })
})
