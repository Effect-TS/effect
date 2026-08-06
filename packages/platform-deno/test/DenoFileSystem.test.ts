import * as DenoFileSystem from "@effect/platform-deno/DenoFileSystem"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { SystemError } from "effect/PlatformError"
import { testLayer } from "../../effect/test/FileSystem.test-utils.ts"

describe("FileSystem", () => {
  testLayer(DenoFileSystem.layer, {
    accessOnDirectory: false,
    tempFileScopedRemovesDirectory: false
  })

  it.effect("reports delegated write errors as writeFile errors", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const path = `${root}/file.txt`
      yield* fs.writeFileString(path, "seed")

      const error = yield* Effect.flip(fs.writeFileString(path, "data", { flag: "r" }))

      assert(error.reason instanceof SystemError)
      assert.strictEqual(error.reason.method, "writeFile")
      assert.strictEqual(error.reason.pathOrDescriptor, path)
    }).pipe(Effect.provide(DenoFileSystem.layer)))

  it.effect("maps an existing copy destination to AlreadyExists", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const source = `${root}/source.txt`
      const destination = `${root}/destination.txt`
      yield* fs.writeFileString(source, "source")
      yield* fs.writeFileString(destination, "destination")

      const error = yield* Effect.flip(fs.copy(source, destination, { overwrite: false }))

      assert(error.reason instanceof SystemError)
      assert.strictEqual(error.reason._tag, "AlreadyExists")
      assert.strictEqual(error.reason.method, "copy")
      assert.strictEqual(error.reason.pathOrDescriptor, source)
      assert.strictEqual(yield* fs.readFileString(destination), "destination")
    }).pipe(Effect.provide(DenoFileSystem.layer)))
})
