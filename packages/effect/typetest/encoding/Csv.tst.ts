import { type Channel, Schema, SchemaGetter } from "effect"
import { Csv } from "effect/encoding"
import { describe, expect, it } from "tstyche"

describe("Csv", () => {
  const person = Schema.Struct({ name: Schema.String, age: Schema.NumberFromString }).pipe(
    Schema.encodeKeys({ name: "Full Name", age: "Age (years)" })
  )

  it("accepts only encoded column names", () => {
    const encode = Csv.encodeSchemaString(person)
    expect(encode).type.toBeCallableWith({ columns: ["Full Name", "Age (years)"], headers: true })
    expect(encode).type.not.toBeCallableWith({ columns: ["name", "age"], headers: true })
    expect(encode).type.not.toBeCallableWith({ columns: [] })
    expect(encode).type.not.toBeCallableWith({ headers: true })
    expect(Csv.encodeSchema(person)).type.not.toBeCallableWith({ columns: ["name"] })
  })

  it("uses positional encoding for transformed tuples", () => {
    const schema = Schema.Tuple([Schema.String, Schema.NumberFromString]).pipe(
      Schema.decodeTo(Schema.Struct({ name: Schema.String, age: Schema.Number }), {
        decode: SchemaGetter.transform(([name, age]) => ({ name, age })),
        encode: SchemaGetter.transform(({ name, age }) => [name, age] as const)
      })
    )
    expect(Csv.encodeSchemaString(schema)).type.toBeCallableWith({})
    expect(Csv.encodeSchemaString(schema)).type.not.toBeCallableWith({ columns: ["name"] })
    expect(Csv.encodeSchemaString(schema)).type.not.toBeCallableWith({ headers: true })
    expect(Csv.decodeSchemaString(schema)()).type.toBe<
      Channel.Channel<
        readonly [
          { readonly name: string; readonly age: number },
          ...Array<{ readonly name: string; readonly age: number }>
        ],
        Csv.CsvError,
        unknown,
        readonly [string, ...Array<string>],
        never,
        unknown,
        never
      >
    >()
  })

  it("preserves independent decoding and encoding services", () => {
    interface DecodeService {
      readonly decode: unique symbol
    }
    interface EncodeService {
      readonly encode: unique symbol
    }
    const schema = {} as Schema.Codec<
      { readonly name: string },
      { readonly csv_name: string },
      DecodeService,
      EncodeService
    >
    expect(Csv.decodeSchemaString(schema)()).type.toBe<
      Channel.Channel<
        readonly [{ readonly name: string }, ...Array<{ readonly name: string }>],
        Csv.CsvError,
        unknown,
        readonly [string, ...Array<string>],
        never,
        unknown,
        DecodeService
      >
    >()
    expect(Csv.encodeSchemaString(schema)({ columns: ["csv_name"] })).type.toBe<
      Channel.Channel<
        readonly [string, ...Array<string>],
        Csv.CsvError,
        unknown,
        readonly [{ readonly name: string }, ...Array<{ readonly name: string }>],
        never,
        unknown,
        EncodeService
      >
    >()
  })
})
