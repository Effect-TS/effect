import * as ConfigFile from "@effect/cli/ConfigFile"
import type { FileSystem } from "@effect/platform"
import { Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import { assert, describe, it } from "vitest"

const runEffect = <E, A>(
  self: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>
): Promise<A> => Effect.provide(self, NodeContext.layer).pipe(Effect.runPromise)

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
