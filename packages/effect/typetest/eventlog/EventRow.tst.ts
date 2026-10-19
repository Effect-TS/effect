import { Effect, Schema } from "effect"
import * as EventRow from "effect/eventlog/EventRow"
import { describe, expect, it } from "tstyche"

const schema = Schema.Struct({ list: Schema.String, aisle: Schema.String, value: Schema.Number })

describe("EventRow", () => {
  it("infers composite keys and excludes them from patches", () => {
    const row = EventRow.make("row", {
      key: {
        fields: ["list", "aisle"],
        derive: (fields) => {
          expect(fields).type.toBe<{ readonly list: string; readonly aisle: string }>()
          return JSON.stringify([fields.list, fields.aisle])
        }
      },
      schema
    })
    expect<Parameters<typeof row.keyOf>[0]>().type.toBe<{ readonly list: string; readonly aisle: string }>()
    expect<ReturnType<typeof row.keyOf>>().type.toBe<string>()
    expect(row.patch).type.toBeCallableWith({ list: "list", aisle: "aisle" }, {})
    expect(row.patch).type.not.toBeCallableWith("key", {})
    expect(row.remove).type.not.toBeCallableWith("key")
    expect(row.patch).type.not.toBeCallableWith({ list: "list", aisle: "aisle" }, { list: "new" })
    expect(row.patch).type.not.toBeCallableWith({ list: "list", aisle: "aisle" }, { aisle: "new" })
    EventRow.handler(row, {
      set: (value, key) => {
        expect(value).type.toBe<typeof schema.Type>()
        expect(key).type.toBe<{ readonly list: string; readonly aisle: string }>()
        return Effect.void
      },
      patch: (key, fields) => {
        expect(key).type.toBe<{ readonly list: string; readonly aisle: string }>()
        expect(fields).type.toBe<{ readonly value?: number }>()
        return Effect.void
      },
      remove: (key) => {
        expect(key).type.toBe<{ readonly list: string; readonly aisle: string }>()
        return Effect.void
      }
    })
  })

  it("distinguishes scalar and declared byte keys without derive", () => {
    const schema = Schema.Struct({ id: Schema.Uint8Array, value: Schema.Number })
    const scalar = EventRow.make("scalar", { key: "id", schema })
    const declared = EventRow.make("declared", { key: { fields: ["id"] }, schema })
    expect<Parameters<typeof scalar.patch>[0]>().type.toBe<Uint8Array>()
    expect<Parameters<typeof scalar.remove>[0]>().type.toBe<Uint8Array>()
    expect<Parameters<typeof declared.patch>[0]>().type.toBe<{ readonly id: Uint8Array }>()
    expect<Parameters<typeof declared.remove>[0]>().type.toBe<{ readonly id: Uint8Array }>()
    expect<ReturnType<typeof scalar.keyOf>>().type.toBe<string>()
    expect(scalar.patch).type.not.toBeCallableWith("key", {})
    expect(scalar.remove).type.not.toBeCallableWith("key")
    expect(declared.patch).type.not.toBeCallableWith("key", {})
    expect(declared.remove).type.not.toBeCallableWith("key")
    expect(scalar.patch).type.not.toBeCallableWith(Uint8Array.of(1), { id: Uint8Array.of(2) })
    EventRow.handler(scalar, {
      set: (_, key) => {
        expect(key).type.toBe<Uint8Array>()
        return Effect.void
      },
      patch: () => Effect.void,
      remove: () => Effect.void
    })
    EventRow.handler(declared, {
      set: (_, key) => {
        expect(key).type.toBe<{ readonly id: Uint8Array }>()
        return Effect.void
      },
      patch: () => Effect.void,
      remove: () => Effect.void
    })
  })

  it("preserves literal shorthand primary keys", () => {
    const row = EventRow.make("literal", {
      key: "id",
      schema: Schema.Struct({ id: Schema.Literals(["a", "b"]), value: Schema.Number })
    })
    expect<ReturnType<typeof row.keyOf>>().type.toBe<"a" | "b">()
  })
})
