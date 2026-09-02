import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Schema } from "effect"
import { Persistable, PersistedCache, Persistence } from "effect/unstable/persistence"
import * as PersistedCacheTest from "./PersistedCacheTest.ts"

PersistedCacheTest.suite("memory", Persistence.layerMemory)

class LookupRequest extends Persistable.Class<{ payload: { id: number } }>()("LookupRequest", {
  primaryKey: ({ id }) => `lookup:${id}`,
  success: Schema.String,
  error: Schema.String
}) {}

describe("PersistedCache lookup exits", () => {
  for (const mode of ["success", "typed failure", "returned defect", "suspended throw", "synchronous throw"] as const) {
    it.effect(`persists and replays ${mode}`, () =>
      Effect.gen(function*() {
        const defect = new Error("lookup defect")
        let calls = 0
        const lookup = (_key: LookupRequest): Effect.Effect<string, string> => {
          calls++
          switch (mode) {
            case "success":
              return Effect.succeed("value")
            case "typed failure":
              return Effect.fail("lookup failure")
            case "returned defect":
              return Effect.die(defect)
            case "suspended throw":
              return Effect.suspend(() => {
                throw defect
              })
            case "synchronous throw":
              throw defect
          }
        }
        const expected = mode === "success"
          ? Exit.succeed("value")
          : mode === "typed failure"
          ? Exit.fail("lookup failure")
          : Exit.die(defect)
        const options = { storeId: "lookup-exits", timeToLive: () => "1 hour" as const }
        const persistence = yield* Persistence.Persistence
        const store = yield* persistence.make({ storeId: options.storeId })
        const cache = yield* PersistedCache.make(lookup, options)
        const first = yield* Effect.exit(cache.get(new LookupRequest({ id: 1 })))
        const stored = yield* store.get(new LookupRequest({ id: 1 }))
        const secondCache = yield* PersistedCache.make(lookup, options)
        const replayed = yield* Effect.exit(secondCache.get(new LookupRequest({ id: 1 })))

        assert.deepStrictEqual(first, expected)
        assert.deepStrictEqual({ stored, replayed, calls }, { stored: expected, replayed: expected, calls: 1 })
      }).pipe(Effect.provide(Persistence.layerMemory)))
  }
})
