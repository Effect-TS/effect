import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Schema from "effect/Schema"

it("ExtInfoLoaded: decodeUnknown succeeds for valid input", () =>
  Effect.gen(function*() {
    const now = new Date()
    const input = { path: "n/a", loadedAt: now }

    const typed = yield* Effect.succeed(input).pipe(Schema.decodeUnknown(CrSqlSchema.ExtInfoLoaded))
    // Round-trip to encoded form to validate transformation correctness
    const roundTripped = yield* Schema.encode(CrSqlSchema.ExtInfoLoaded)(typed)

    assert.strictEqual(roundTripped.path, "n/a")
    assert.ok(roundTripped.loadedAt instanceof Date)
    assert.strictEqual(roundTripped.loadedAt.getTime(), now.getTime())
  }))

it("ExtInfoLoaded: decodeUnknown rejects invalid input", () =>
  Effect.gen(function*() {
    const bad1 = { path: 123, loadedAt: new Date() } as unknown
    const bad2 = { path: "ok", loadedAt: "2024-01-01T00:00:00Z" } as unknown

    const left1 = yield* Schema.decodeUnknown(CrSqlSchema.ExtInfoLoaded)(bad1).pipe(Effect.either)
    assert.strictEqual(left1._tag, "Left")

    const left2 = yield* Schema.decodeUnknown(CrSqlSchema.ExtInfoLoaded)(bad2).pipe(Effect.either)
    assert.strictEqual(left2._tag, "Left")
  }))
