import { BadArgument } from "@effect/platform/Error"
import * as Path from "@effect/platform/Path"
import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"

const runPromise = <E, A>(effect: Effect.Effect<Path.Path, E, A>) =>
  Effect.runPromise(Effect.provide(effect, Path.layer))

describe("Path", () => {
  it("fromFileUrl", () =>
    runPromise(Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      expect(yield* _(path.fromFileUrl(new URL("file:///foo/bar")))).toBe("/foo/bar")
    })))

  it("fromFileUrl - http", () =>
    runPromise(Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      expect(yield* _(Effect.flip(path.fromFileUrl(new URL("http://foo/bar"))))).toEqual(BadArgument({
        module: "Path",
        method: "fromFileUrl",
        message: "URL must be of scheme file"
      }))
    })))

  it("toFileUrl", () =>
    runPromise(Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      expect(yield* _(path.toFileUrl("/foo/bar"))).toEqual(new URL("file:///foo/bar"))
    })))
})
