import * as DenoFileSystem from "@effect/platform-deno/DenoFileSystem"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { testLayer } from "../../../effect/test/FileSystem.test-utils.ts"

describe("FileSystem", () =>
  testLayer(DenoFileSystem.layer, {
    accessOnDirectory: false,
    tempFileScopedRemovesDirectory: false
  }))

describe.skipIf(Deno.build.os === "windows")("writeFile", () => {
  it.effect("applies the mode when creating a file", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const path = `${directory}/created`

      yield* fs.writeFileString(path, "content", { mode: 0o600 })

      assert.strictEqual((yield* fs.stat(path)).mode & 0o777, 0o600)
    }).pipe(Effect.provide(DenoFileSystem.layer)))

  it.effect("preserves the mode of an existing file", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* fs.makeTempFileScoped()
      yield* fs.chmod(path, 0o640)

      yield* fs.writeFileString(path, "content", { mode: 0o600 })

      assert.strictEqual((yield* fs.stat(path)).mode & 0o777, 0o640)
    }).pipe(Effect.provide(DenoFileSystem.layer)))
})
