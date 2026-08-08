import * as DenoFileSystem from "@effect/platform-deno/DenoFileSystem"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { testLayer } from "../../effect/test/FileSystem.test-utils.ts"

describe("FileSystem", () => {
  testLayer(DenoFileSystem.layer, {
    accessOnDirectory: false,
    tempFileScopedRemovesDirectory: false
  })

  it.effect("copyFile rejects unsupported copy file modes", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const source = `${root}/source.txt`
      const destination = `${root}/destination.txt`

      yield* fs.writeFileString(source, "source")

      const exclusiveError = yield* Effect.flip(
        fs.copyFile(source, destination, { mode: FileSystem.CopyFileFlag.COPYFILE_EXCL })
      )
      assert.strictEqual(exclusiveError.reason._tag, "BadArgument")

      yield* fs.copyFile(source, destination, { mode: FileSystem.CopyFileFlag.COPYFILE_FICLONE })
      assert.strictEqual(yield* fs.readFileString(destination), "source")

      const forceError = yield* Effect.flip(
        fs.copyFile(source, destination, { mode: FileSystem.CopyFileFlag.COPYFILE_FICLONE_FORCE })
      )
      assert.strictEqual(forceError.reason._tag, "BadArgument")
    }).pipe(
      Effect.scoped,
      Effect.provide(DenoFileSystem.layer)
    ))
})
