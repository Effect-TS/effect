import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Option, Stream } from "effect"

describe("FileSystem.sink", () => {
  it.effect("uses write mode when flag is undefined", () =>
    Effect.gen(function*() {
      let flag: FileSystem.OpenFlag | undefined
      const file: FileSystem.File = {
        [FileSystem.FileTypeId]: FileSystem.FileTypeId,
        stat: Effect.die("unused"),
        sync: Effect.void,
        seek: () => Effect.succeed(FileSystem.Size(0)),
        read: () => Effect.succeed(FileSystem.Size(0)),
        readAlloc: () => Effect.succeed(Option.none()),
        truncate: () => Effect.void,
        write: (buffer) => Effect.succeed(FileSystem.Size(buffer.length)),
        writeAll: () => Effect.void
      }
      const fs = FileSystem.make({
        ...FileSystem.makeNoop({}),
        open: (_path, options) =>
          Effect.sync(() => {
            flag = options?.flag
            return file
          })
      })

      yield* Stream.run(Stream.empty, fs.sink("output.bin", { flag: undefined }))

      assert.strictEqual(flag, "w")
    }))
})
