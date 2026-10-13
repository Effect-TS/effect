import { describe, it } from "@effect/vitest"
import { assertNone, assertSome } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Path from "effect/Path"

describe("Path", () => {
  it.effect("resolveWithin keeps POSIX paths lexically inside the root", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path

      assertSome(path.resolveWithin("/srv/app", "src/index.ts"), "/srv/app/src/index.ts")
      assertSome(path.resolveWithin("/srv/app/", "src/index.ts"), "/srv/app/src/index.ts")
      assertSome(path.resolveWithin("/srv/app", "."), "/srv/app")
      assertSome(path.resolveWithin("/srv/app", ""), "/srv/app")
      assertSome(path.resolveWithin("/srv/app", "..foo"), "/srv/app/..foo")
      assertSome(path.resolveWithin("/", "etc/passwd"), "/etc/passwd")

      assertNone(path.resolveWithin("/srv/app", "../app-other/x.ts"))
      assertNone(path.resolveWithin("/srv/app", "a/../../b"))
      assertNone(path.resolveWithin("/srv/app", "/etc/passwd"))
    }).pipe(Effect.provide(Path.layer)))
})
