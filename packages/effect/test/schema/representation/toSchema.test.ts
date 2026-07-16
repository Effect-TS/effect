import { Redacted, Schema, SchemaRepresentation } from "effect"
import { describe, it } from "vitest"
import { deepStrictEqual, strictEqual } from "../../utils/assert.ts"
import { builtInRevivers } from "./testUtils.ts"

describe("SchemaRepresentation revival parity", () => {
  function assertToSchemaRoundtrip(input: {
    schema: Schema.Top
    readonly reviver?: unknown
  }, runtime: string) {
    const document = SchemaRepresentation.fromAST(input.schema.ast)
    const json = SchemaRepresentation.toJson(document)
    const revived = SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: builtInRevivers })
    const roundtrip = SchemaRepresentation.fromAST(revived.ast)
    if (Object.keys(document.references).length === 0) {
      deepStrictEqual(SchemaRepresentation.toJson(roundtrip), json)
    }
    const codeDocument = SchemaRepresentation.toCodeDocument(SchemaRepresentation.toMultiDocument(roundtrip))
    const omitExpected = (code: string) => code.replaceAll(/\.annotate\(\{ "expected": "(?:\\.|[^"\\])*" \}\)/g, "")
    strictEqual(omitExpected(codeDocument.codes[0].runtime), runtime)
  }

  describe("String", () => {
    it("String", () => {
      assertToSchemaRoundtrip(
        { schema: Schema.String },
        `Schema.String`
      )
    })

    it("String & check", () => {
      assertToSchemaRoundtrip(
        { schema: Schema.String.check(Schema.isMinLength(1)) },
        `Schema.String.check(Schema.isMinLength(1))`
      )
    })

    describe("checks", () => {
      it("isTrimmed", () => {
        assertToSchemaRoundtrip(
          { schema: Schema.String.check(Schema.isTrimmed()) },
          `Schema.String.check(Schema.isTrimmed())`
        )
      })

      it("isULID", () => {
        assertToSchemaRoundtrip(
          { schema: Schema.String.check(Schema.isULID()) },
          `Schema.String.check(Schema.isULID())`
        )
      })

      it("isGUID", () => {
        assertToSchemaRoundtrip(
          { schema: Schema.String.check(Schema.isGUID()) },
          `Schema.String.check(Schema.isGUID())`
        )
      })
    })
  })

  it("Struct", () => {
    assertToSchemaRoundtrip(
      { schema: Schema.Struct({}) },
      `Schema.Struct({  })`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Struct({ a: Schema.String }) },
      `Schema.Struct({ "a": Schema.String })`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Struct({ [Symbol.for("a")]: Schema.String }) },
      `Schema.Struct({ [_symbol]: Schema.String })`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Struct({ a: Schema.optionalKey(Schema.String) }) },
      `Schema.Struct({ "a": Schema.optionalKey(Schema.String) })`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Struct({ a: Schema.mutableKey(Schema.String) }) },
      `Schema.Struct({ "a": Schema.mutableKey(Schema.String) })`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Struct({ a: Schema.optionalKey(Schema.mutableKey(Schema.String)) }) },
      `Schema.Struct({ "a": Schema.optionalKey(Schema.mutableKey(Schema.String)) })`
    )
  })

  it("Record", () => {
    assertToSchemaRoundtrip(
      { schema: Schema.Record(Schema.String, Schema.Number) },
      `Schema.Record(Schema.String, Schema.Number)`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Record(Schema.Symbol, Schema.Number) },
      `Schema.Record(Schema.Symbol, Schema.Number)`
    )
  })

  it("StructWithRest", () => {
    assertToSchemaRoundtrip(
      {
        schema: Schema.StructWithRest(Schema.Struct({ a: Schema.Number }), [
          Schema.Record(Schema.String, Schema.Number)
        ])
      },
      `Schema.StructWithRest(Schema.Struct({ "a": Schema.Number }), [Schema.Record(Schema.String, Schema.Number)])`
    )
  })

  it("Tuple", () => {
    assertToSchemaRoundtrip(
      { schema: Schema.Tuple([]) },
      `Schema.Tuple([])`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Tuple([Schema.String, Schema.Number]) },
      `Schema.Tuple([Schema.String, Schema.Number])`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.Tuple([Schema.String, Schema.optionalKey(Schema.Number)]) },
      `Schema.Tuple([Schema.String, Schema.optionalKey(Schema.Number)])`
    )
  })

  it("Array", () => {
    assertToSchemaRoundtrip(
      { schema: Schema.Array(Schema.String) },
      `Schema.Array(Schema.String)`
    )
  })

  it("TupleWithRest", () => {
    assertToSchemaRoundtrip(
      { schema: Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number]) },
      `Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number])`
    )
    assertToSchemaRoundtrip(
      { schema: Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number, Schema.Boolean]) },
      `Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number, Schema.Boolean])`
    )
  })

  it("Suspend", () => {
    type Category = {
      readonly name: string
      readonly children: ReadonlyArray<Category>
    }

    const OuterCategory = Schema.Struct({
      name: Schema.String,
      children: Schema.Array(Schema.suspend((): Schema.Codec<Category> => OuterCategory))
    }).annotate({ identifier: "Category" })

    assertToSchemaRoundtrip(
      { schema: OuterCategory },
      `Category`
    )
  })

  describe("brand", () => {
    it("brand", () => {
      assertToSchemaRoundtrip(
        { schema: Schema.String.pipe(Schema.brand("a")) },
        `Schema.String.pipe(Schema.brand("a"))`
      )
    })

    it("brand & brand", () => {
      assertToSchemaRoundtrip(
        { schema: Schema.String.pipe(Schema.brand("a"), Schema.brand("b")) },
        `Schema.String.pipe(Schema.brand("a"), Schema.brand("b"))`
      )
    })

    it("check & brand", () => {
      assertToSchemaRoundtrip(
        { schema: Schema.String.check(Schema.isMinLength(1)).pipe(Schema.brand("b")) },
        `Schema.String.check(Schema.isMinLength(1)).pipe(Schema.brand("b"))`
      )
    })

    it("brand & check & brand", () => {
      assertToSchemaRoundtrip(
        { schema: Schema.String.pipe(Schema.brand("a")).check(Schema.isMinLength(1)).pipe(Schema.brand("b")) },
        `Schema.String.pipe(Schema.brand("a")).check(Schema.isMinLength(1)).pipe(Schema.brand("b"))`
      )
    })

    it("check & brand & check", () => {
      assertToSchemaRoundtrip(
        { schema: Schema.String.check(Schema.isMinLength(1)).pipe(Schema.brand("b")).check(Schema.isMaxLength(2)) },
        `Schema.String.check(Schema.isMinLength(1)).pipe(Schema.brand("b")).check(Schema.isMaxLength(2))`
      )
    })
  })

  describe("toSchemaDefaultReviver", () => {
    function assertToSchemaWithReviver(schema: Schema.Top, runtime: string) {
      assertToSchemaRoundtrip({ schema, reviver: builtInRevivers }, runtime)
    }

    it("Option", () => {
      assertToSchemaWithReviver(
        Schema.Option(Schema.String),
        `Schema.Option(Schema.String)`
      )
      assertToSchemaWithReviver(
        Schema.Option(Schema.URL),
        `Schema.Option(Schema.URL)`
      )
    })

    it("Result", () => {
      assertToSchemaWithReviver(
        Schema.Result(Schema.String, Schema.Number),
        `Schema.Result(Schema.String, Schema.Number)`
      )
    })

    it("Json", () => {
      assertToSchemaWithReviver(
        Schema.Json,
        `Schema.Json`
      )
    })

    it("MutableJson", () => {
      assertToSchemaWithReviver(
        Schema.MutableJson,
        `Schema.MutableJson`
      )
    })

    it("Redacted", () => {
      assertToSchemaWithReviver(
        Schema.Redacted(Schema.String),
        `Schema.Redacted(Schema.String)`
      )
    })

    it("Redacted options", () => {
      const schema = Schema.Redacted(Schema.String, {
        label: "password",
        disallowJsonEncode: true
      })
      const document = SchemaRepresentation.fromAST(schema.ast)
      const roundtrip = SchemaRepresentation.toSchema(
        SchemaRepresentation.fromJson(SchemaRepresentation.toJson(document)),
        {
          revivers: builtInRevivers
        }
      ) as typeof schema
      const encode = Schema.encodeUnknownExit(Schema.toCodecJson(roundtrip))

      strictEqual(
        String(encode(Redacted.make("secret", { label: "password" }))),
        `Failure(Cause([Fail(SchemaError(Cannot serialize Redacted with label: "password"))]))`
      )
      strictEqual(
        String(encode(Redacted.make("secret", { label: "other" }))),
        `Failure(Cause([Fail(SchemaError(Expected "password", got "other"
  at ["label"]))]))`
      )
    })

    it("CauseReason", () => {
      assertToSchemaWithReviver(
        Schema.CauseReason(Schema.String, Schema.Number),
        `Schema.CauseReason(Schema.String, Schema.Number)`
      )
    })

    it("Cause", () => {
      assertToSchemaWithReviver(
        Schema.Cause(Schema.String, Schema.Number),
        `Schema.Cause(Schema.String, Schema.Number)`
      )
    })

    it("Exit", () => {
      assertToSchemaWithReviver(
        Schema.Exit(Schema.String, Schema.Number, Schema.Boolean),
        `Schema.Exit(Schema.String, Schema.Number, Schema.Boolean)`
      )
    })

    it("ReadonlyMap", () => {
      assertToSchemaWithReviver(
        Schema.ReadonlyMap(Schema.String, Schema.Number),
        `Schema.ReadonlyMap(Schema.String, Schema.Number)`
      )
    })

    it("HashMap", () => {
      assertToSchemaWithReviver(
        Schema.HashMap(Schema.String, Schema.Number),
        `Schema.HashMap(Schema.String, Schema.Number)`
      )
    })

    it("Chunk", () => {
      assertToSchemaWithReviver(
        Schema.Chunk(Schema.String),
        `Schema.Chunk(Schema.String)`
      )
    })

    it("ReadonlySet", () => {
      assertToSchemaWithReviver(
        Schema.ReadonlySet(Schema.String),
        `Schema.ReadonlySet(Schema.String)`
      )
    })

    it("RegExp", () => {
      assertToSchemaWithReviver(
        Schema.RegExp,
        `Schema.RegExp`
      )
    })

    it("URL", () => {
      assertToSchemaWithReviver(
        Schema.URL,
        `Schema.URL`
      )
    })

    describe("Date", () => {
      it("Date", () => {
        assertToSchemaWithReviver(
          Schema.Date,
          `Schema.Date`
        )
      })

      describe("checks", () => {
        it("isDateValid", () => {
          assertToSchemaWithReviver(
            Schema.Date.check(Schema.isDateValid()),
            `Schema.Date.check(Schema.isDateValid())`
          )
        })

        it("isGreaterThanDate", () => {
          assertToSchemaWithReviver(
            Schema.Date.check(Schema.isGreaterThanDate(new Date(0))),
            `Schema.Date.check(Schema.isGreaterThanDate(new Date(0)))`
          )
        })

        it("isGreaterThanOrEqualToDate", () => {
          assertToSchemaWithReviver(
            Schema.Date.check(Schema.isGreaterThanOrEqualToDate(new Date(0))),
            `Schema.Date.check(Schema.isGreaterThanOrEqualToDate(new Date(0)))`
          )
        })

        it("isLessThanDate", () => {
          assertToSchemaWithReviver(
            Schema.Date.check(Schema.isLessThanDate(new Date(0))),
            `Schema.Date.check(Schema.isLessThanDate(new Date(0)))`
          )
        })

        it("isLessThanOrEqualToDate", () => {
          assertToSchemaWithReviver(
            Schema.Date.check(Schema.isLessThanOrEqualToDate(new Date(0))),
            `Schema.Date.check(Schema.isLessThanOrEqualToDate(new Date(0)))`
          )
        })
      })
    })

    it("Duration", () => {
      assertToSchemaWithReviver(
        Schema.Duration,
        `Schema.Duration`
      )
    })

    it("FormData", () => {
      assertToSchemaWithReviver(
        Schema.FormData,
        `Schema.FormData`
      )
    })

    it("URLSearchParams", () => {
      assertToSchemaWithReviver(
        Schema.URLSearchParams,
        `Schema.URLSearchParams`
      )
    })

    it("Uint8Array", () => {
      assertToSchemaWithReviver(
        Schema.Uint8Array,
        `Schema.Uint8Array`
      )
    })

    it("DateTime.Utc", () => {
      assertToSchemaWithReviver(
        Schema.DateTimeUtc,
        `Schema.DateTimeUtc`
      )
    })

    it("Error", () => {
      assertToSchemaWithReviver(
        Schema.Error(),
        `Schema.Error()`
      )
    })

    it("Error with stack", () => {
      assertToSchemaWithReviver(
        Schema.Error({ includeStack: true }),
        `Schema.Error({"includeStack":true})`
      )
    })

    it("Error with excluded cause", () => {
      assertToSchemaWithReviver(
        Schema.Error({ excludeCause: true }),
        `Schema.Error({"excludeCause":true})`
      )
    })

    it("Defect", () => {
      assertToSchemaWithReviver(
        Schema.Defect(),
        `Schema.Unknown`
      )
    })

    it("HashSet", () => {
      assertToSchemaWithReviver(
        Schema.HashSet(Schema.String),
        `Schema.HashSet(Schema.String)`
      )
    })

    it("BigDecimal", () => {
      assertToSchemaWithReviver(
        Schema.BigDecimal,
        `Schema.BigDecimal`
      )
    })

    it("TimeZoneOffset", () => {
      assertToSchemaWithReviver(
        Schema.TimeZoneOffset,
        `Schema.TimeZoneOffset`
      )
    })

    it("TimeZoneNamed", () => {
      assertToSchemaWithReviver(
        Schema.TimeZoneNamed,
        `Schema.TimeZoneNamed`
      )
    })

    it("TimeZone", () => {
      assertToSchemaWithReviver(
        Schema.TimeZone,
        `Schema.TimeZone`
      )
    })

    it("DateTimeZoned", () => {
      assertToSchemaWithReviver(
        Schema.DateTimeZoned,
        `Schema.DateTimeZoned`
      )
    })

    describe("ReadonlySet", () => {
      it("ReadonlySet(String)", () => {
        assertToSchemaWithReviver(
          Schema.ReadonlySet(Schema.String),
          `Schema.ReadonlySet(Schema.String)`
        )
      })

      describe("checks", () => {
        it("isMinSize", () => {
          assertToSchemaWithReviver(
            Schema.ReadonlySet(Schema.String).check(Schema.isMinSize(2)),
            `Schema.ReadonlySet(Schema.String).check(Schema.isMinSize(2))`
          )
        })

        it("isMaxSize", () => {
          assertToSchemaWithReviver(
            Schema.ReadonlySet(Schema.String).check(Schema.isMaxSize(2)),
            `Schema.ReadonlySet(Schema.String).check(Schema.isMaxSize(2))`
          )
        })
      })

      it("isSizeBetween", () => {
        assertToSchemaWithReviver(
          Schema.ReadonlySet(Schema.String).check(Schema.isSizeBetween(2, 2)),
          `Schema.ReadonlySet(Schema.String).check(Schema.isSizeBetween(2, 2))`
        )
      })
    })
  })
})
