import { FileSystem, PlatformLogger } from "@effect/platform"
import { describe, test } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Effect, Logger, pipe } from "effect"

const fileLogger = Logger.simple((_: unknown) => String(_)).pipe(
  PlatformLogger.toFile("./tmp.txt", { flag: "a+" })
)
const LoggerLive = Logger.replaceScoped(Logger.defaultLogger, fileLogger)

describe("PlatformLogger", () => {
  test("toFile", () =>
    Effect.gen(function*() {
      const chunks: Array<string> = []
      yield* pipe(
        Effect.gen(function*() {
          yield* (Effect.log("a"))
          yield* (Effect.log("b"))
          yield* (Effect.log("c"))
          yield* (Effect.sleep(0))
          yield* (Effect.log("d"))
          yield* (Effect.log("e"))
        }),
        Effect.scoped,
        Effect.provide(LoggerLive),
        Effect.provideService(FileSystem.FileSystem, {
          open: (path: string, options?: FileSystem.OpenFileOptions) => {
            strictEqual(path, "./tmp.txt")
            deepStrictEqual(options, { flag: "a+" })
            return Effect.succeed({
              write: (chunk: Uint8Array) =>
                Effect.tap(Effect.sleep(10), () => {
                  chunks.push(new TextDecoder().decode(chunk))
                })
            })
          }
        } as any)
      )

      deepStrictEqual(chunks, ["a\nb\nc\nd\ne\n"])
    }).pipe(Effect.runPromise))
})
