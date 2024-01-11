import * as ConfigFile from "@effect/cli/ConfigFile"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as Path from "@effect/platform-node/Path"
import { Layer } from "effect"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import { assert, describe, it } from "vitest"

const MainLive = Layer.mergeAll(FileSystem.layer, Path.layer)

const runEffect = <E, A>(
  self: Effect.Effect<FileSystem.FileSystem | Path.Path, E, A>
): Promise<A> => Effect.provide(self, MainLive).pipe(Effect.runPromise)

describe("ConfigFile", () => {
  it("loads json files", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const result = yield* _(
        Config.all([
          Config.boolean("foo"),
          Config.string("bar")
        ]),
        Effect.provide(ConfigFile.layer("config", {
          searchPaths: [path.join(__dirname, "fixtures")],
          formats: ["json"]
        }))
      )
      assert.deepStrictEqual(result, [true, "baz"])
    }).pipe(runEffect))

  it("loads yaml", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const result = yield* _(
        Config.integer("foo"),
        Effect.provide(ConfigFile.layer("config-file", {
          searchPaths: [path.join(__dirname, "fixtures")]
        }))
      )
      assert.deepStrictEqual(result, 123)
    }).pipe(runEffect))
})
