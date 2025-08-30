import { getLibSqlitePath } from "@effect-native/libsqlite/effect"
import { it } from "@effect/vitest"
import * as Effect from "effect/Effect"

it.effect("getLibSqlitePath yields a string", () =>
  Effect.gen(function*() {
    const p = yield* getLibSqlitePath
    // we don't assert filesystem existence here; packaging assembles binaries in release
    yield* Effect.sync(() => {
      if (typeof p !== "string" || p.length === 0) {
        throw new Error("expected a non-empty string path")
      }
    })
  }))
