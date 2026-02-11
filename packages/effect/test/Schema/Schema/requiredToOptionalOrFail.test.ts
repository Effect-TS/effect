import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("requiredToOptionalOrFail", () => {
  it("decode: returns Option.some for valid values", async () => {
    const ps = S.requiredToOptionalOrFail(
      S.NumberFromString,
      S.Number,
      {
        decode: (n) => Effect.succeed(Option.some(n)),
        encode: (o) => Effect.succeed(Option.getOrElse(o, () => 0))
      }
    )
    const schema = S.Struct({ a: ps })
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
  })

  it("decode: returns Option.none to omit the property", async () => {
    const ps = S.requiredToOptionalOrFail(
      S.NumberFromString,
      S.Number,
      {
        decode: (n) => Effect.succeed(n === 0 ? Option.none() : Option.some(n)),
        encode: (o) => Effect.succeed(Option.getOrElse(o, () => 0))
      }
    )
    const schema = S.Struct({ a: ps })
    await Util.assertions.decoding.succeed(schema, { a: "0" }, {})
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
  })

  it("encode: receives Option.none when property is missing", async () => {
    const ps = S.requiredToOptionalOrFail(
      S.NumberFromString,
      S.Number,
      {
        decode: (n) => Effect.succeed(Option.some(n)),
        encode: (o) => Effect.succeed(Option.getOrElse(o, () => 0))
      }
    )
    const schema = S.Struct({ a: ps })
    await Util.assertions.encoding.succeed(schema, {}, { a: "0" })
    await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
  })

  it("decode: can fail with ParseIssue", async () => {
    const ps = S.requiredToOptionalOrFail(
      S.Number,
      S.Number,
      {
        decode: (n) =>
          n < 0
            ? ParseResult.fail(new ParseResult.Type(S.Number.ast, n, "must be non-negative"))
            : Effect.succeed(Option.some(n)),
        encode: (o) => Effect.succeed(Option.getOrElse(o, () => 0))
      }
    )
    const schema = S.Struct({ a: ps })
    await Util.assertions.decoding.succeed(schema, { a: 1 }, { a: 1 })
    await Util.assertions.decoding.fail(
      schema,
      { a: -1 },
      `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ (number <-> Option<number>)
            └─ Transformation process failure
               └─ must be non-negative`
    )
  })

  it("encode: can fail with ParseIssue", async () => {
    const ps = S.requiredToOptionalOrFail(
      S.Number,
      S.Number,
      {
        decode: (n) => Effect.succeed(Option.some(n)),
        encode: (o) =>
          Option.match(o, {
            onNone: () => ParseResult.fail(new ParseResult.Type(S.Number.ast, o, "value is required")),
            onSome: (n) => Effect.succeed(n)
          })
      }
    )
    const schema = S.Struct({ a: ps })
    await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: 1 })
    await Util.assertions.encoding.fail(
      schema,
      {},
      `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ (number <-> Option<number>)
            └─ Transformation process failure
               └─ value is required`
    )
  })
})
