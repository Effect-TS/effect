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
