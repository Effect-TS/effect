import { describe, it } from "@effect/vitest"
import { Effect, ParseResult, Schema } from "effect"
import * as Util from "./TestUtils.js"

const EffectfulStringFailure = Schema.transformOrFail(Schema.String, Schema.String, {
  strict: true,
  decode: (actual, _, ast) =>
    actual === ""
      ? Effect.fail(new ParseResult.Type(ast, actual, "Empty String"))
      : Effect.succeed(actual),
  encode: Effect.succeed
}).annotations({ identifier: "EffectfulStringFailure" })

describe("Effectful Schemas", () => {
  describe("TupleType", () => {
    it("elements", async () => {
      const schema = Schema.Tuple(EffectfulStringFailure, Schema.String)

      await Util.assertions.decoding.succeed(schema, ["a", "b"])

      await Util.assertions.decoding.fail(
        schema,
        ["", "b"],
        `readonly [EffectfulStringFailure, string]
└─ [0]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["", null],
        `readonly [EffectfulStringFailure, string]
├─ [0]
│  └─ EffectfulStringFailure
│     └─ Transformation process failure
│        └─ Empty String
└─ [1]
   └─ Expected string, actual null`,
        { parseOptions: Util.ErrorsAll }
      )
    })

    it("rest", async () => {
      const schema = Schema.Array(EffectfulStringFailure)

      await Util.assertions.decoding.succeed(schema, ["a", "b"])

      await Util.assertions.decoding.fail(
        schema,
        ["", "b"],
        `ReadonlyArray<EffectfulStringFailure>
└─ [0]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["", ""],
        `ReadonlyArray<EffectfulStringFailure>
├─ [0]
│  └─ EffectfulStringFailure
│     └─ Transformation process failure
│        └─ Empty String
└─ [1]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`,
        { parseOptions: Util.ErrorsAll }
      )
    })

    it("Rest & post rest elements", async () => {
      const schema = Schema.Tuple([], Schema.String, EffectfulStringFailure, EffectfulStringFailure)

      await Util.assertions.decoding.succeed(schema, ["a", "b", "c"])

      await Util.assertions.decoding.fail(
        schema,
        ["a", "", ""],
        `readonly [...string[], EffectfulStringFailure, EffectfulStringFailure]
└─ [1]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a", "", ""],
        `readonly [...string[], EffectfulStringFailure, EffectfulStringFailure]
├─ [1]
│  └─ EffectfulStringFailure
│     └─ Transformation process failure
│        └─ Empty String
└─ [2]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`,
        { parseOptions: Util.ErrorsAll }
      )
    })
  })

  describe("TypeLiteral", () => {
    it("property signatures", async () => {
      const schema = Schema.Struct({
        a: EffectfulStringFailure,
        b: Schema.String
      })

      await Util.assertions.decoding.succeed(schema, { a: "a", b: "b" })

      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly a: EffectfulStringFailure; readonly b: string }
└─ ["a"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: undefined },
        `{ readonly a: EffectfulStringFailure; readonly b: string }
└─ ["a"]
   └─ EffectfulStringFailure
      └─ Encoded side transformation failure
         └─ Expected string, actual undefined`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "", b: "b" },
        `{ readonly a: EffectfulStringFailure; readonly b: string }
└─ ["a"]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "", b: null },
        `{ readonly a: EffectfulStringFailure; readonly b: string }
├─ ["a"]
│  └─ EffectfulStringFailure
│     └─ Transformation process failure
│        └─ Empty String
└─ ["b"]
   └─ Expected string, actual null`,
        { parseOptions: Util.ErrorsAll }
      )
    })

    it("index signatures", async () => {
      const schema = Schema.Record({ key: Schema.String, value: EffectfulStringFailure })

      await Util.assertions.decoding.succeed(schema, { a: "a", b: "b" })

      await Util.assertions.decoding.fail(
        schema,
        { a: "" },
        `{ readonly [x: string]: EffectfulStringFailure }
└─ ["a"]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "", b: "" },
        `{ readonly [x: string]: EffectfulStringFailure }
├─ ["a"]
│  └─ EffectfulStringFailure
│     └─ Transformation process failure
│        └─ Empty String
└─ ["b"]
   └─ EffectfulStringFailure
      └─ Transformation process failure
         └─ Empty String`,
        { parseOptions: Util.ErrorsAll }
      )
    })
  })
})
