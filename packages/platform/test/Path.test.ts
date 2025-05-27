import { BadArgument } from "@effect/platform/Error"
import * as Path from "@effect/platform/Path"
import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"

const runPromise = <E, A>(effect: Effect.Effect<A, E, Path.Path>) =>
  Effect.runPromise(Effect.provide(effect, Path.layer))

describe("Path", () => {
  it("fromFileUrl", () =>
    runPromise(Effect.gen(function*() {
      const path = yield* (Path.Path)
      strictEqual(yield* (path.fromFileUrl(new URL("file:///foo/bar"))), "/foo/bar")
    })))

  it("fromFileUrl - http", () =>
    runPromise(Effect.gen(function*() {
      const path = yield* (Path.Path)
      deepStrictEqual(
        yield* (Effect.flip(path.fromFileUrl(new URL("http://foo/bar")))),
        new BadArgument({
          module: "Path",
          method: "fromFileUrl",
          description: "URL must be of scheme file"
        })
      )
    })))

  it("toFileUrl", () =>
    runPromise(Effect.gen(function*() {
      const path = yield* (Path.Path)
      deepStrictEqual(yield* (path.toFileUrl("/foo/bar")), new URL("file:///foo/bar"))
    })))
})
