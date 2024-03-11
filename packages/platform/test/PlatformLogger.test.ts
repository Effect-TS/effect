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
          yield* _(Effect.log("d"))
          yield* _(Effect.log("e"))
        }),
        Effect.scoped,
        Effect.provide(LoggerLive),
        Effect.provideService(FileSystem.FileSystem, {
          open: (path: string, options?: FileSystem.OpenFileOptions) => {
            assert.strictEqual(path, "./tmp.txt")
            assert.deepStrictEqual(options, { flag: "a+" })
            return Effect.succeed({
              write: (chunk: Uint8Array) =>
                Effect.tap(Effect.sleep(10), () => {
                  chunks.push(new TextDecoder().decode(chunk))
                })
            })
          }
        } as any)
      )

      assert.deepStrictEqual(chunks, ["a\nb\nc\nd\ne\n"])
    }).pipe(Effect.runPromise))
})
