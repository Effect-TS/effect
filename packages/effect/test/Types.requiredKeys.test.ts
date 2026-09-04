import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

describe("RequiredKeys consumer runtime preservation", () => {
  it("StructWithRest preserves the named field and additional entries", () => {
    const schema = Schema.StructWithRest(Schema.Struct({ a: Schema.Number }), [
      Schema.Record(Schema.String, Schema.Number)
    ])
    assert.deepStrictEqual(schema.make({ a: 1, extra: 2 }), { a: 1, extra: 2 })
    assert.throws(() => Schema.decodeUnknownSync(schema)({ extra: 2 }))
  })
  it("empty and defaulted Class inputs remain optional", () => {
    class Empty extends Schema.Class<Empty>("Empty")({}) {}
    class Defaulted extends Schema.Class<Defaulted>("Defaulted")({
      a: Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(1)))
    }) {}
    assert.instanceOf(Empty.make(), Empty)
    assert.strictEqual(Defaulted.make().a, 1)
  })
})
