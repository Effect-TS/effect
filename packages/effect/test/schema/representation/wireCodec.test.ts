import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

function asRecord(value: Schema.Json): Record<string, any> {
  assert.isTrue(typeof value === "object" && value !== null && !Array.isArray(value))
  return value as Record<string, any>
}

describe("SchemaRepresentation persisted wire codecs", () => {
  it("roundtrips a custom check without reviving callbacks", () => {
    const check = Schema.makeFilter<string>(() => true, {
      description: "custom check",
      callback: () => "live only",
      representation: {
        id: "acme/schema/customCheck",
        payload: { _tag: "BigInt", value: "1" },
        schemas: [Schema.Number.ast]
      }
    }).abort()
    const json = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.String.check(check).ast)
    )

    assert.deepStrictEqual(json, {
      representation: {
        _tag: "String",
        checks: [{
          _tag: "Filter",
          annotations: {
            description: "custom check",
            representation: {
              id: "acme/schema/customCheck",
              payload: { _tag: "BigInt", value: "1" },
              schemas: [{ _tag: "Number", checks: [] }]
            }
          },
          aborted: true
        }]
      },
      references: {}
    })

    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(json)
    const encoded = Schema.encodeSync(SchemaRepresentation.DocumentFromJson)(persisted)
    assert.deepStrictEqual(encoded, json)

    const representation = persisted.representation
    assert.strictEqual(representation._tag, "String")
    if (representation._tag !== "String") {
      return
    }
    const persistedCheck = representation.checks[0]
    assert.strictEqual(persistedCheck._tag, "Filter")
    assert.deepStrictEqual(persistedCheck.annotations?.representation?.payload, {
      _tag: "BigInt",
      value: "1"
    })
  })

  it("uses envelopes only for compatible structural fields", () => {
    const symbol = Symbol.for("acme/schema/key")
    const schema = Schema.Tuple([
      Schema.Literal("1"),
      Schema.Literal(1n),
      Schema.Literal(0),
      Schema.Literal(-0),
      Schema.UniqueSymbol(symbol),
      Schema.Struct({ [symbol]: Schema.String })
    ])
    const json = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(schema.ast))
    const root = asRecord(json).representation

    assert.strictEqual(root._tag, "Arrays")
    assert.strictEqual(root.elements[0].type.literal, "1")
    assert.deepStrictEqual(root.elements[1].type.literal, { _tag: "BigInt", value: "1" })
    assert.strictEqual(root.elements[2].type.literal, 0)
    assert.deepStrictEqual(root.elements[3].type.literal, { _tag: "ExceptionalNumber", value: "-0" })
    assert.deepStrictEqual(root.elements[4].type.symbol, { _tag: "GlobalSymbol", key: "acme/schema/key" })
    assert.deepStrictEqual(root.elements[5].type.propertySignatures[0].name, {
      _tag: "GlobalSymbol",
      key: "acme/schema/key"
    })

    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(json)
    assert.strictEqual(persisted.representation._tag, "Arrays")
    if (persisted.representation._tag !== "Arrays") {
      return
    }
    const elements = persisted.representation.elements
    const bigint = elements[1].type
    const negativeZero = elements[3].type
    const uniqueSymbol = elements[4].type
    const object = elements[5].type
    assert.strictEqual(bigint._tag, "Literal")
    assert.strictEqual(negativeZero._tag, "Literal")
    assert.strictEqual(uniqueSymbol._tag, "UniqueSymbol")
    assert.strictEqual(object._tag, "Objects")
    if (
      bigint._tag === "Literal" &&
      negativeZero._tag === "Literal" &&
      uniqueSymbol._tag === "UniqueSymbol" &&
      object._tag === "Objects"
    ) {
      assert.strictEqual(bigint.literal, 1n)
      assert.isTrue(Object.is(negativeZero.literal, -0))
      assert.strictEqual(uniqueSymbol.symbol, symbol)
      assert.strictEqual(object.propertySignatures[0].name, symbol)
    }
  })

  it("roundtrips every exceptional structural number", () => {
    const document: SchemaRepresentation.Document = {
      representation: {
        _tag: "Enum",
        enums: [
          ["negativeZero", -0],
          ["notANumber", Number.NaN],
          ["positiveInfinity", Number.POSITIVE_INFINITY],
          ["negativeInfinity", Number.NEGATIVE_INFINITY]
        ],
        checks: []
      },
      references: {}
    }
    const json = Schema.encodeSync(SchemaRepresentation.DocumentFromJson)(document)
    assert.deepStrictEqual(asRecord(json).representation.enums, [
      ["negativeZero", { _tag: "ExceptionalNumber", value: "-0" }],
      ["notANumber", { _tag: "ExceptionalNumber", value: "NaN" }],
      ["positiveInfinity", { _tag: "ExceptionalNumber", value: "Infinity" }],
      ["negativeInfinity", { _tag: "ExceptionalNumber", value: "-Infinity" }]
    ])

    const decoded = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(json)
    assert.strictEqual(decoded.representation._tag, "Enum")
    if (decoded.representation._tag === "Enum") {
      assert.isTrue(Object.is(decoded.representation.enums[0][1], -0))
      assert.isTrue(Number.isNaN(decoded.representation.enums[1][1]))
      assert.strictEqual(decoded.representation.enums[2][1], Number.POSITIVE_INFINITY)
      assert.strictEqual(decoded.representation.enums[3][1], Number.NEGATIVE_INFINITY)
    }
  })

  it("rejects malformed and non-canonical structural envelopes", () => {
    const json = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Literal(1n).ast)
    )

    for (
      const value of [
        { _tag: "BigInt", value: "01" },
        { _tag: "BigInt", value: "+1" },
        { _tag: "BigInt", value: "-0" },
        { _tag: "ExceptionalNumber", value: "0" },
        { _tag: "Unknown", value: "1" }
      ]
    ) {
      const invalid = JSON.parse(JSON.stringify(json))
      invalid.representation.literal = value
      throws(
        () => Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(invalid),
        (error) => {
          assert.isTrue(Schema.isSchemaError(error))
          return undefined
        }
      )
    }
  })

  it("does not coerce strings that resemble legacy primitive encodings", () => {
    const schema = Schema.Tuple([
      Schema.Literal("1"),
      Schema.Literal("Symbol(a)"),
      Schema.Literal("NaN")
    ])
    const json = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(schema.ast))
    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(json)
    assert.strictEqual(persisted.representation._tag, "Arrays")
    if (persisted.representation._tag === "Arrays") {
      assert.deepStrictEqual(
        persisted.representation.elements.map((element) =>
          element.type._tag === "Literal" ? element.type.literal : undefined
        ),
        ["1", "Symbol(a)", "NaN"]
      )
    }
  })

  it("rejects invalid manual annotations instead of omitting them", () => {
    const invalid = {
      representation: {
        _tag: "String",
        annotations: { invalid: 1n },
        checks: []
      },
      references: {}
    }
    throws(
      () => Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(invalid),
      (error) => {
        assert.isTrue(Schema.isSchemaError(error))
        return undefined
      }
    )
    assert.strictEqual(invalid.representation.annotations.invalid, 1n)
  })

  it("accepts getters without invoking toJSON while decoding", () => {
    let getterCalls = 0
    let toJsonCalls = 0
    const representation = {
      _tag: "String",
      checks: [] as Array<never>
    }
    Object.defineProperty(representation, "annotations", {
      enumerable: true,
      get() {
        getterCalls++
        return {}
      }
    })
    const input = {
      representation,
      references: {}
    }
    Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(input)
    assert.isTrue(getterCalls > 0)

    throws(
      () =>
        Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)({
          ...input,
          toJSON() {
            toJsonCalls++
            return null
          }
        }),
      (error) => {
        assert.isTrue(Schema.isSchemaError(error))
        return undefined
      }
    )
    assert.strictEqual(toJsonCalls, 0)
  })

  it("roundtrips representation annotations on structural nodes", () => {
    const input = {
      representation: {
        _tag: "String",
        annotations: {
          representation: {
            id: "acme/schema/String",
            payload: null
          }
        },
        checks: []
      },
      references: {}
    }
    const decoded = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(input)
    assert.deepStrictEqual(Schema.encodeSync(SchemaRepresentation.DocumentFromJson)(decoded), input)

    const document = SchemaRepresentation.fromJson(input)
    assert.deepStrictEqual(document, decoded)
    const schema = SchemaRepresentation.toSchema(document, { revivers: [] })
    const representation = SchemaRepresentation.fromAST(schema.ast).representation
    assert.strictEqual(representation._tag, "String")
    if (representation._tag === "String") {
      assert.deepStrictEqual(representation.annotations?.representation, {
        id: "acme/schema/String",
        payload: null
      })
    }
  })

  it("reports persisted wire failures", () => {
    const cases: ReadonlyArray<readonly [SchemaRepresentation.Representation, string]> = [
      [
        { _tag: "Reference", $ref: "" },
        `Expected <filter>, got ""\n  at ["representation"]["$ref"]`
      ],
      [
        { _tag: "String", annotations: { representation: { id: "", payload: null } }, checks: [] },
        `Expected <filter>, got ""\n  at ["representation"]["annotations"]["representation"]["id"]`
      ],
      [
        SchemaRepresentation.fromAST(Schema.UniqueSymbol(Symbol("local")).ast).representation,
        `Expected <filter>, got Symbol(local)\n  at ["representation"]["symbol"]`
      ],
      [
        {
          _tag: "Objects",
          propertySignatures: [{
            name: Symbol("local"),
            type: { _tag: "String", checks: [] },
            isOptional: false,
            isMutable: false
          }],
          indexSignatures: [],
          checks: []
        },
        `Expected <filter>, got Symbol(local)\n  at ["representation"]["propertySignatures"][0]["name"]`
      ]
    ]

    for (const [representation, message] of cases) {
      throws(
        () => SchemaRepresentation.toJson({ representation, references: {} }),
        message
      )
    }
  })

  it("encodes and decodes multi-documents independently", () => {
    const live = SchemaRepresentation.fromASTs([Schema.String.ast, Schema.Number.ast])
    const json = SchemaRepresentation.toJsonMultiDocument(live)
    assert.deepStrictEqual(json, {
      representations: [
        { _tag: "String", checks: [] },
        { _tag: "Number", checks: [] }
      ],
      references: {}
    })

    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.MultiDocumentFromJson)(json)
    assert.deepStrictEqual(persisted.representations.map((representation) => representation._tag), [
      "String",
      "Number"
    ])
    assert.deepStrictEqual(
      Schema.encodeSync(SchemaRepresentation.MultiDocumentFromJson)(persisted),
      json
    )
  })

  it("roundtrips and revives every structural keyword kind", () => {
    const symbol = Symbol.for("acme/schema/structural-keyword")
    const live = SchemaRepresentation.fromASTs([
      Schema.Null.ast,
      Schema.Undefined.ast,
      Schema.Void.ast,
      Schema.Never.ast,
      Schema.UniqueSymbol(symbol).ast,
      Schema.ObjectKeyword.ast
    ])
    const json = SchemaRepresentation.toJsonMultiDocument(live)
    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.MultiDocumentFromJson)(json)

    assert.deepStrictEqual(
      persisted.representations.map((representation) => representation._tag),
      ["Null", "Undefined", "Void", "Never", "UniqueSymbol", "ObjectKeyword"]
    )

    const document = SchemaRepresentation.fromJsonMultiDocument(json)
    assert.deepStrictEqual(document, persisted)
    const revived = SchemaRepresentation.toSchemaMultiDocument(document, {
      revivers: []
    })
    const is = revived.schemas.map((schema) => Schema.is(schema))
    assert.isTrue(is[0](null))
    assert.isTrue(is[1](undefined))
    assert.isTrue(is[2](undefined))
    assert.isFalse(is[3](undefined))
    assert.isTrue(is[4](symbol))
    assert.isFalse(is[4](Symbol.for("acme/schema/other")))
    assert.isTrue(is[5]({}))
    assert.isFalse(is[5](null))
  })

  it("decodes and revives an empty union as Never", () => {
    const json = {
      representation: { _tag: "Union", types: [], mode: "anyOf", checks: [] },
      references: {}
    } as const
    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(json)
    assert.deepStrictEqual(persisted.representation, json.representation)

    const is = Schema.is(SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [] }))
    assert.isFalse(is(undefined))
    assert.isFalse(is(null))
  })

  it("reports JSON failures at the root and on direct encoding", () => {
    const rootFailure = Schema.decodeUnknownResult(SchemaRepresentation.DocumentFromJson)(() => undefined)
    assert.strictEqual(rootFailure._tag, "Failure")
    if (rootFailure._tag === "Failure") {
      assert.isTrue(rootFailure.failure.message.includes("Expected JSON value"))
    }

    const encodeFailure = Schema.encodeUnknownResult(SchemaRepresentation.DocumentFromJson)({
      representation: { _tag: "Reference", $ref: "" },
      references: {}
    })
    assert.strictEqual(encodeFailure._tag, "Failure")
  })

  it("roundtrips recursive references", () => {
    let recursive: Schema.Codec<unknown>
    recursive = Schema.suspend((): Schema.Codec<unknown> => recursive)

    const json = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(recursive.ast))
    assert.deepStrictEqual(json, {
      representation: { _tag: "Reference", $ref: "Suspend_" },
      references: {
        Suspend_: {
          _tag: "Suspend",
          checks: [],
          thunk: { _tag: "Reference", $ref: "Suspend_" }
        }
      }
    })
    assert.deepStrictEqual(
      Schema.encodeSync(SchemaRepresentation.DocumentFromJson)(
        Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(json)
      ),
      json
    )
  })

  it("roundtrips structural string content schemas", () => {
    const schema = Schema.fromJsonString(Schema.Struct({ value: Schema.Number }))
    const live = SchemaRepresentation.fromAST(SchemaAST.toEncoded(schema.ast))
    const json = SchemaRepresentation.toJson(live)
    const root = asRecord(json).representation
    assert.strictEqual(root.contentMediaType, "application/json")
    assert.strictEqual(root.contentSchema._tag, "Objects")

    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(json)
    assert.strictEqual(persisted.representation._tag, "String")
    if (persisted.representation._tag === "String") {
      assert.strictEqual(persisted.representation.contentMediaType, "application/json")
      assert.strictEqual(persisted.representation.contentSchema?._tag, "Objects")
    }
  })

  it("roundtrips enum, template literal and union nodes through revival", () => {
    const schema = Schema.Union([
      Schema.Enum({ A: "a" }),
      Schema.TemplateLiteral(["prefix", Schema.String])
    ])
    const json = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(schema.ast))
    const revived = SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [] })
    const is = Schema.is(revived)

    assert.isTrue(is("a"))
    assert.isTrue(is("prefix-value"))
    assert.isFalse(is("other"))
  })
})
