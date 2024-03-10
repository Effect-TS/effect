import { FileSystem, PlatformLogger } from "@effect/platform"
import { Effect, Logger } from "effect"
import { assert, describe, test } from "vitest"

const fileLogger = Logger.simple((_: unknown) => String(_)).pipe(
  PlatformLogger.toFile("./tmp.txt", { flag: "a+" })
)
const LoggerLive = Logger.replaceScoped(Logger.defaultLogger, fileLogger)

describe("PlatformLogger", () => {
  test("toFile", () =>
    Effect.gen(function*(_) {
      const chunks: Array<string> = []
      yield* _(
        Effect.gen(function*(_) {
          yield* _(Effect.log("a"))
          yield* _(Effect.log("b"))
          yield* _(Effect.log("c"))
          yield* _(Effect.sleep(0))
        }),
        Effect.scoped,
        Effect.provide(LoggerLive),
        Effect.provideService(FileSystem.FileSystem, {
          open: (path: string, options?: FileSystem.OpenFileOptions) => {
            assert.strictEqual(path, "./tmp.txt")
            assert.deepStrictEqual(options, { flag: "a+" })
            return Effect.succeed({
              write: (chunk: Uint8Array) => {
                chunks.push(new TextDecoder().decode(chunk))
                return Effect.unit
              }
            })
          }
        } as any)
      )

      assert.deepStrictEqual(chunks, ["a\n", "b\n", "c\n"])
    }).pipe(Effect.runPromise))
})
