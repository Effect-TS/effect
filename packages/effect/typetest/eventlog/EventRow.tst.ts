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
    const literal = EventRow.make("literal", {
      key: "id",
      schema: Schema.Struct({ id: Schema.Literals(["a", "b"]), value: Schema.Number })
    })

    expect<Parameters<typeof composite.keyOf>[0]>().type.toBe<{ readonly list: string; readonly aisle: string }>()
    expect<Parameters<typeof derived.keyOf>[0]>().type.toBe<{ readonly list: string }>()
    expect<Parameters<typeof derivedComposite.keyOf>[0]>().type.toBe<{
      readonly list: string
      readonly aisle: string
    }>()
    expect<Parameters<typeof single.keyOf>[0]>().type.toBe<{ readonly list: string }>()
    expect<ReturnType<typeof composite.keyOf>>().type.toBe<string>()
    expect<ReturnType<typeof derived.keyOf>>().type.toBe<string>()
    expect<ReturnType<typeof derivedComposite.keyOf>>().type.toBe<string>()
    expect<ReturnType<typeof literal.keyOf>>().type.toBe<"a" | "b">()

    const numberSchema = Schema.Struct({ part: Schema.Number, value: Schema.String })
    const nullableSchema = Schema.Struct({ part: Schema.Union([Schema.Null, Schema.Undefined, Schema.String]) })
    expect(EventRow.make).type.not.toBeCallableWith("number", { key: { fields: ["part"] }, schema: numberSchema })
    expect(EventRow.make).type.not.toBeCallableWith("nullable", { key: { fields: ["part"] }, schema: nullableSchema })
    const numberKey = EventRow.make("number", {
      key: {
        fields: ["part"],
        derive: (fields) => {
          expect(fields).type.toBe<{ readonly part: number }>()
          return String(fields.part)
        }
      },
      schema: numberSchema
    })
    const nullableKey = EventRow.make("nullable", {
      key: {
        fields: ["part"],
        derive: (fields) => {
          expect(fields).type.toBe<{ readonly part: string | null | undefined }>()
          return fields.part === null ? "null" : fields.part === undefined ? "undefined" : "string:" + fields.part
        }
      },
      schema: nullableSchema
    })
    expect<ReturnType<typeof numberKey.keyOf>>().type.toBe<string>()
    expect<ReturnType<typeof nullableKey.keyOf>>().type.toBe<string>()

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
