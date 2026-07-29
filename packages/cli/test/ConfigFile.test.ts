import * as ConfigFile from "@effect/cli/ConfigFile"
import type { FileSystem } from "@effect/platform"
import { Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"

const runEffect = <E, A>(
  self: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>
): Promise<A> => Effect.provide(self, NodeContext.layer).pipe(Effect.runPromise)

describe("ConfigFile", () => {
  it("rejects file names containing path separators or '..' segments", () =>
    Effect.gen(function*() {
      for (const fileName of ["../config", "config\\file", ".."]) {
        const error = yield* Effect.flip(ConfigFile.makeProvider(fileName))
        assert.strictEqual(error._tag, "ConfigFileError")
        assert.strictEqual(error.message, "fileName must not contain path separators or '..' segments")
      }
    }).pipe(runEffect))

  it("loads json files", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const result = yield* Config.all([
        Config.boolean("foo"),
        Config.string("bar")
      ]).pipe(
        Effect.provide(ConfigFile.layer("config", {
          searchPaths: [path.join(__dirname, "fixtures")],
          formats: ["json"]
        }))
      )
      assert.deepStrictEqual(result, [true, "baz"])
    }).pipe(runEffect))

  it("supports relative, absolute, and '..'-containing search paths", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const fixtures = path.join(__dirname, "fixtures")
      const searchPaths = [
        path.relative(".", fixtures),
        fixtures,
        `${fixtures}${path.sep}..${path.sep}fixtures`
      ]
      const results = yield* Effect.forEach(searchPaths, (searchPath) =>
        Config.boolean("foo").pipe(
          Effect.provide(ConfigFile.layer("config", {
            searchPaths: [searchPath],
            formats: ["json"]
          }))
        ))
      assert.deepStrictEqual(results, [true, true, true])
    }).pipe(runEffect))

  it("loads yaml", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const result = yield* Config.integer("foo").pipe(
        Effect.provide(ConfigFile.layer("config-file", {
          searchPaths: [path.join(__dirname, "fixtures")]
        }))
      )
      assert.deepStrictEqual(result, 123)
    }).pipe(runEffect))
})
