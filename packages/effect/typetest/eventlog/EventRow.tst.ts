import { Effect, Schema } from "effect"
import * as EventRow from "effect/eventlog/EventRow"
import { describe, expect, it } from "tstyche"

const schema = Schema.Struct({ list: Schema.String, aisle: Schema.String, value: Schema.Number })

describe("EventRow", () => {
  it("excludes every declared key field from patches", () => {
    const composite = EventRow.make("composite", { key: { fields: ["list", "aisle"] }, schema })
    const derived = EventRow.make("derived", {
      key: {
        fields: ["list"],
        derive: (fields) => {
          expect(fields).type.toBe<{ readonly list: string }>()
          return fields.list.toLowerCase()
        }
      },
      schema
    })
    const derivedComposite = EventRow.make("derivedComposite", {
      key: {
        fields: ["list", "aisle"],
        derive: (fields) => {
          expect(fields).type.toBe<{ readonly list: string; readonly aisle: string }>()
          return JSON.stringify([fields.list, fields.aisle])
        }
      },
      schema
    })
    const single = EventRow.make("single", { key: "list", schema })

    expect<Parameters<typeof composite.patch>[1]>().type.toBe<{ readonly value?: number }>()
    expect<Parameters<typeof derivedComposite.patch>[1]>().type.toBe<{ readonly value?: number }>()
    expect<Parameters<typeof derived.patch>[1]>().type.toBe<{ readonly aisle?: string; readonly value?: number }>()
    expect<Parameters<typeof single.patch>[1]>().type.toBe<{ readonly aisle?: string; readonly value?: number }>()
    expect(composite.patch).type.toBeCallableWith("key", {})
    expect(composite.patch).type.not.toBeCallableWith("key", { list: "new" })
    expect(composite.patch).type.not.toBeCallableWith("key", { aisle: "new" })
    expect(derived.patch).type.not.toBeCallableWith("key", { list: "new" })
    expect(derivedComposite.patch).type.not.toBeCallableWith("key", { list: "new" })
    expect(derivedComposite.patch).type.not.toBeCallableWith("key", { aisle: "new" })
  })

  it("uses string keys in constructors and callbacks", () => {
    const row = EventRow.make("row", { key: { fields: ["list", "aisle"] }, schema })
    expect<Parameters<typeof row.patch>[0]>().type.toBe<string>()
    expect<Parameters<typeof row.remove>[0]>().type.toBe<string>()
    expect(row.patch).type.not.toBeCallableWith(["list", "aisle"], { value: 1 })
    expect(row.remove).type.not.toBeCallableWith({ list: "list", aisle: "aisle" })
    EventRow.handler(row, {
      set: (value, key) => {
        expect(value).type.toBe<typeof schema.Type>()
        expect(key).type.toBe<string>()
        return Effect.void
      },
      patch: (key, fields) => {
        expect(key).type.toBe<string>()
        expect(fields).type.toBe<{ readonly value?: number }>()
        return Effect.void
      },
      remove: (key) => {
        expect(key).type.toBe<string>()
        return Effect.void
      }
    })
  })
})
