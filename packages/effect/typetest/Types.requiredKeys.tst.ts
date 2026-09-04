import { Effect, Schema, type Types } from "effect"
import { describe, expect, it } from "tstyche"

type Row = { readonly a: number; readonly [key: string]: number }
declare const key: unique symbol
type Numeric = { readonly 0: number; readonly [key: number]: number }
type Symbolic = { readonly [key]: number; readonly [key: symbol]: number }
type Legacy<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T]
type GenericRow<V> = { value: V; [key: string]: V }

describe("RequiredKeys indexed records", () => {
  it("string index retains named required key", () => {
    expect<[Types.RequiredKeys<Row>]>().type.toBe<["a"]>()
    expect<Types.RequiredKeys<Row>>().type.not.toBe<never>()
    expect<[Types.RequiredKeys<Row>]>().type.not.toBe<[string]>()
  })
  it("positive consumer assignment", () => {
    const required: Types.RequiredKeys<Row> = "a"
    expect(required).type.toBe<"a">()
  })
  it("numeric index retains required literal", () => {
    expect<[Types.RequiredKeys<Numeric>]>().type.toBe<[0]>()
    expect<[Types.RequiredKeys<Numeric>]>().type.not.toBe<[number]>()
  })
  it("symbol index retains unique symbol", () => {
    expect<[Types.RequiredKeys<Symbolic>]>().type.toBe<[typeof key]>()
    expect<[Types.RequiredKeys<Symbolic>]>().type.not.toBe<[symbol]>()
  })
  it("multiple fields optional readonly and generic instantiation", () => {
    expect<
      Types.RequiredKeys<{ a: number; readonly b: number; optional?: number; [key: string]: number | undefined }>
    >().type.toBe<"a" | "b">()
    expect<Types.RequiredKeys<GenericRow<string>>>().type.toBe<"value">()
    expect<Types.RequiredKeys<Readonly<GenericRow<number>>>>().type.toBe<"value">()
  })
  it("control required field is structurally required", () => {
    expect<{}>().type.not.toBeAssignableTo<Row>()
    expect<Pick<Row, "a">>().type.toBe<{ readonly a: number }>()
    expect<Types.RequiredKeys<{ readonly a: number }>>().type.toBe<"a">()
    expect<Types.RequiredKeys<{ 0: number }>>().type.toBe<0>()
    expect<Types.RequiredKeys<{ [key]: number }>>().type.toBe<typeof key>()
  })
  it("control incorrect literal assignments rejected", () => {
    expect<["other"]>().type.not.toBeAssignableTo<[Types.RequiredKeys<Row>]>()
    expect<[1]>().type.not.toBeAssignableTo<[Types.RequiredKeys<Numeric>]>()
    expect<[symbol]>().type.not.toBeAssignableTo<[Types.RequiredKeys<Symbolic>]>()
  })
  it("control bare indexes optional keys and empty object", () => {
    expect<Types.RequiredKeys<Record<string, number>>>().type.toBe<never>()
    expect<Types.RequiredKeys<Record<number, number>>>().type.toBe<never>()
    expect<Types.RequiredKeys<Record<symbol, number>>>().type.toBe<never>()
    expect<Types.RequiredKeys<{ optional?: number; [key: string]: number | undefined }>>().type.toBe<never>()
    expect<Types.RequiredKeys<{}>>().type.toBe<never>()
    expect<Types.RequiredKeys<{ a: undefined; b?: undefined }>>().type.toBe<"a">()
  })
  it("control unaffected nonindexed union algebra", () => {
    type U1 = { a: number } | { a?: number }
    type U2 = { a: number; b?: string } | { a: number; c: boolean }
    type U3 = { a: number } | { b: number }
    expect<Types.RequiredKeys<U1>>().type.toBe<Legacy<U1>>()
    expect<Types.RequiredKeys<U2>>().type.toBe<Legacy<U2>>()
    expect<[Types.RequiredKeys<U3>]>().type.toBe<[Legacy<U3>]>()
    expect<Types.RequiredKeys<U1>>().type.toBe<"a">()
    expect<Types.RequiredKeys<U2>>().type.toBe<"a">()
    expect<Types.RequiredKeys<U3>>().type.toBe<never>()
  })
  it("control array and tuple compatibility", () => {
    expect<Types.RequiredKeys<Array<number>>>().type.toBe<Legacy<Array<number>>>()
    expect<Types.RequiredKeys<ReadonlyArray<number>>>().type.toBe<Legacy<ReadonlyArray<number>>>()
    expect<Types.RequiredKeys<[number, string?]>>().type.toBe<Legacy<[number, string?]>>()
    expect<Types.RequiredKeys<readonly [number, ...Array<string>]>>().type.toBe<
      Legacy<readonly [number, ...Array<string>]>
    >()
  })
  it("control template index compatibility", () => {
    type Pattern = { a: number; [key: `data-${string}`]: number }
    type Bare = { [key: `data-${string}`]: number }
    expect<Types.RequiredKeys<Pattern>>().type.toBe<Legacy<Pattern>>()
    expect<[Types.RequiredKeys<Bare>]>().type.toBe<[Legacy<Bare>]>()
    expect<Types.RequiredKeys<Pattern>>().type.toBe<"a">()
  })
  it("generic helper retains finite and indexed named keys", () => {
    type PickRequired<T> = Pick<T, Types.RequiredKeys<T>>
    expect<PickRequired<{ a: number; b?: string }>>().type.toBe<{ a: number }>()
    expect<PickRequired<GenericRow<number>>>().type.toBe<{ value: number }>()
  })
  it("Schema StructWithRest indexed output", () => {
    const schema = Schema.StructWithRest(Schema.Struct({ a: Schema.Number }), [
      Schema.Record(Schema.String, Schema.Number)
    ])
    expect<typeof schema.Type>().type.toBe<Row>()
    expect<Types.RequiredKeys<typeof schema.Type>>().type.toBe<"a">()
    expect(schema.make({ a: 1, extra: 2 })).type.toBe<Row>()
  })
  it("control Schema empty defaulted and required classes", () => {
    class Empty extends Schema.Class<Empty>("Empty")({}) {}
    class Defaulted extends Schema.Class<Defaulted>("Defaulted")({
      a: Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(1)))
    }) {}
    class Required extends Schema.Class<Required>("Required")({ a: Schema.Number }) {}
    expect(Empty.make()).type.toBe<Empty>()
    expect(Defaulted.make()).type.toBe<Defaulted>()
    expect(Required.make({ a: 1 })).type.toBe<Required>()
    expect(Required.make).type.not.toBeCallableWith()
  })
})
