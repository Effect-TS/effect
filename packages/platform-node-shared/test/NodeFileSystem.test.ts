import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Stream from "effect/Stream"
import { testLayer } from "../../effect/test/FileSystem.test-utils.ts"

describe("FileSystem", () => {
  testLayer(NodeFileSystem.layer)

  it.effect("watch does not report nested changes when recursive is false", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const nested = `${root}/nested`
      yield* fs.makeDirectory(nested)

      const fiber = yield* fs.watch(root, { recursive: false }).pipe(
        Stream.runHead,
        Effect.flatMap(Effect.fromOption),
        Effect.fork
      )
      yield* Effect.yieldNow

      yield* fs.writeFileString(`${nested}/nested.txt`, "")
      yield* fs.writeFileString(`${root}/direct.txt`, "")

      const event = yield* Fiber.join(fiber)
      assert.strictEqual(event.path, "direct.txt")
    }).pipe(
      Effect.scoped,
      Effect.provide(NodeFileSystem.layer)
    ))

  it.effect("watch reports nested changes when recursive is true", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const nested = `${root}/nested`
      yield* fs.makeDirectory(nested)

      const fiber = yield* fs.watch(root, { recursive: true }).pipe(
        Stream.runHead,
        Effect.flatMap(Effect.fromOption),
        Effect.fork
      )
      yield* Effect.yieldNow

      yield* fs.writeFileString(`${nested}/nested.txt`, "")

      const event = yield* Fiber.join(fiber)
      assert(event.path.endsWith("nested.txt"))
    }).pipe(
      Effect.scoped,
      Effect.provide(NodeFileSystem.layer)
    ))
})
