import { assert, describe, it } from "@effect/vitest"
import { Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

interface DateCheckCase {
  readonly name: string
  readonly id: string
  readonly payload: Schema.Json
  readonly make: () => SchemaAST.Filter<Date>
  readonly reviver: SchemaRepresentation.AnyReviver
  readonly runtime: string
  readonly valid: Date
  readonly invalid: Date
  readonly jsonSchema: object
}

function date(millis: number): Date {
  return Schema.decodeUnknownSync(Schema.DateFromMillis)(millis)
}

const epoch = "1970-01-01T00:00:00.000Z"

const cases: ReadonlyArray<DateCheckCase> = [
  {
    name: "isDateValid",
    id: "effect/schema/isDateValid",
    payload: null,
    make: () => Schema.isDateValid(),
    reviver: Schema.isDateValidReviver,
    runtime: "Schema.isDateValid()",
    valid: date(0),
    invalid: date(NaN),
    jsonSchema: { format: "date-time" }
  },
  {
    name: "isGreaterThanDate",
    id: "effect/schema/isGreaterThanDate",
    payload: { exclusiveMinimum: epoch },
    make: () => Schema.isGreaterThanDate(date(0)),
    reviver: Schema.isGreaterThanDateReviver,
    runtime: "Schema.isGreaterThanDate(new Date(0))",
    valid: date(1),
    invalid: date(0),
    jsonSchema: {}
  },
  {
    name: "isGreaterThanOrEqualToDate",
    id: "effect/schema/isGreaterThanOrEqualToDate",
    payload: { minimum: epoch },
    make: () => Schema.isGreaterThanOrEqualToDate(date(0)),
    reviver: Schema.isGreaterThanOrEqualToDateReviver,
    runtime: "Schema.isGreaterThanOrEqualToDate(new Date(0))",
    valid: date(0),
    invalid: date(-1),
    jsonSchema: {}
  },
  {
    name: "isLessThanDate",
    id: "effect/schema/isLessThanDate",
    payload: { exclusiveMaximum: epoch },
    make: () => Schema.isLessThanDate(date(0)),
    reviver: Schema.isLessThanDateReviver,
    runtime: "Schema.isLessThanDate(new Date(0))",
    valid: date(-1),
    invalid: date(0),
    jsonSchema: {}
  },
  {
    name: "isLessThanOrEqualToDate",
    id: "effect/schema/isLessThanOrEqualToDate",
    payload: { maximum: epoch },
    make: () => Schema.isLessThanOrEqualToDate(date(0)),
    reviver: Schema.isLessThanOrEqualToDateReviver,
    runtime: "Schema.isLessThanOrEqualToDate(new Date(0))",
    valid: date(0),
    invalid: date(1),
    jsonSchema: {}
  },
  {
    name: "isBetweenDate",
    id: "effect/schema/isBetweenDate",
    payload: {
      minimum: epoch,
      maximum: "1970-01-01T00:00:00.002Z",
      exclusiveMaximum: true
    },
    make: () => Schema.isBetweenDate({ minimum: date(0), maximum: date(2), exclusiveMaximum: true }),
    reviver: Schema.isBetweenDateReviver,
    runtime:
      "Schema.isBetweenDate({ minimum: new Date(0), maximum: new Date(2), exclusiveMinimum: undefined, exclusiveMaximum: true })",
    valid: date(1),
    invalid: date(2),
    jsonSchema: {}
  }
]

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

function expectInvalidPayload(json: Schema.Json, reviver: SchemaRepresentation.AnyReviver): void {
  throws(
    () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [reviver] }),
    `Invalid representation payload for ${reviver.id}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
  )
}

describe("SchemaRepresentation built-in Date checks", () => {
  it("emits canonical ISO payloads and target callbacks", () => {
    for (const entry of cases) {
      const check = entry.make()
      assert.deepStrictEqual(check.annotations?.representation, {
        id: entry.id,
        payload: entry.payload
      })
      assert.deepStrictEqual(check.annotations?.toJsonSchema?.({ type: undefined, schemas: [] }), entry.jsonSchema)
      assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
        runtime: entry.runtime
      })
    }
  })

  it("revives every check independently from the Date declaration", () => {
    const asts = cases.map((entry, index) =>
      Schema.Any.annotate(index === 0 ? { description: "first" } : {}).check(entry.make()).ast
    ) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    const json = SchemaRepresentation.toJsonMultiDocument(SchemaRepresentation.fromASTs(asts))
    const revived = SchemaRepresentation.toSchemaMultiDocument(SchemaRepresentation.fromJsonMultiDocument(json), {
      revivers: cases.map((entry) => entry.reviver)
    })

    assert.strictEqual(revived.schemas.length, cases.length)
    for (let index = 0; index < cases.length; index++) {
      const entry = cases[index]
      const schema = noServices(revived.schemas[index])
      assert.isTrue(Schema.decodeUnknownResult(schema)(entry.valid)._tag === "Success")
      assert.isTrue(Schema.decodeUnknownResult(schema)(entry.invalid)._tag === "Failure")
      assert.strictEqual(schema.ast.checks?.[0].annotations?.representation?.id, entry.id)
      assert.isTrue(typeof schema.ast.checks?.[0].annotations?.toJsonSchema === "function")
      assert.isTrue(typeof schema.ast.checks?.[0].annotations?.toCode === "function")
    }
    assert.strictEqual(revived.schemas[0].ast.annotations?.description, "first")

    const lowered = SchemaRepresentation.fromASTs(
      revived.schemas.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    assert.deepStrictEqual(SchemaRepresentation.toJsonMultiDocument(lowered), json)
  })

  it("compiles every callback without requiring the Date declaration", () => {
    const document = SchemaRepresentation.fromASTs(
      cases.map((entry) => Schema.Any.check(entry.make()).ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const jsonSchema = SchemaRepresentation.toJsonSchemaMultiDocument(document)
    const code = SchemaRepresentation.toCodeDocument(document)

    for (let index = 0; index < cases.length; index++) {
      assert.deepStrictEqual(jsonSchema.schemas[index], cases[index].jsonSchema)
      assert.isTrue(code.codes[index].runtime.includes(cases[index].runtime))
    }
  })

  it("normalizes millisecond precision and between flags", () => {
    assert.deepStrictEqual(Schema.isGreaterThanDate(date(123)).annotations?.representation, {
      id: "effect/schema/isGreaterThanDate",
      payload: { exclusiveMinimum: "1970-01-01T00:00:00.123Z" }
    })

    const between = Schema.isBetweenDate({
      minimum: date(-1),
      maximum: date(1),
      exclusiveMinimum: false,
      exclusiveMaximum: true
    })
    assert.deepStrictEqual(between.annotations?.representation, {
      id: "effect/schema/isBetweenDate",
      payload: {
        minimum: "1969-12-31T23:59:59.999Z",
        maximum: "1970-01-01T00:00:00.001Z",
        exclusiveMaximum: true
      }
    })
  })

  it("rejects valid but non-canonical ISO strings", () => {
    const original = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Any.check(Schema.isGreaterThanDate(date(0))).ast)
    )
    for (
      const value of [
        "1970-01-01T00:00:00Z",
        "1970-01-01T01:00:00.000+01:00",
        "1970-01-01",
        "1970-01-01T00:00:00.000z",
        "invalid"
      ]
    ) {
      const json = JSON.parse(JSON.stringify(original))
      json.representation.checks[0].annotations.representation.payload.exclusiveMinimum = value
      expectInvalidPayload(json, Schema.isGreaterThanDateReviver)
    }
  })

  it("keeps Invalid Date bounds live but rejects their persisted payload", () => {
    const check = Schema.isGreaterThanDate(date(NaN))
    assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
      runtime: "Schema.isGreaterThanDate(new Date(NaN))"
    })
    throws(
      () => SchemaRepresentation.toJson(SchemaRepresentation.fromAST(Schema.Any.check(check).ast)),
      `Expected JSON value, got {"exclusiveMinimum":NaN}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
    )
  })
})
