import type { PlatformError, Scope } from "effect"
import { Effect, Layer, Logger } from "effect"
import * as FileSystem from "effect/FileSystem"
import { describe, expect, it } from "tstyche"

describe("Logger.toFile", () => {
  it("requires only the open operation of the file system", () => {
    const toFile = Logger.toFile(Logger.formatSimple, "app.log")
    expect(toFile).type.toBe<
      Effect.Effect<Logger.Logger<unknown, void>, PlatformError.PlatformError, Scope.Scope | "effect/FileSystem/open">
    >()
    expect(Logger.formatSimple.pipe(Logger.toFile("app.log"))).type.toBe<typeof toFile>()
  })

  it("is satisfied by a layer of open, or by the whole file system", () => {
    const toFile = Effect.scoped(Logger.toFile(Logger.formatSimple, "app.log"))
    const open = Layer.succeed(FileSystem.open, () => Effect.die("unused"))
    expect(toFile.pipe(Effect.provide(open))).type.toBe<
      Effect.Effect<Logger.Logger<unknown, void>, PlatformError.PlatformError>
    >()
    expect(toFile.pipe(Effect.provide(FileSystem.layerNoop({})))).type.toBe<
      Effect.Effect<Logger.Logger<unknown, void>, PlatformError.PlatformError>
    >()
  })
})
