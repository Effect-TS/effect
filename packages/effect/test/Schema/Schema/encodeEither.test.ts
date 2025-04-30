import { describe, it } from "@effect/vitest"
import * as Either from "effect/Either"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("encodeEither", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return an error on invalid values", async () => {
    Util.assertions.either.right(S.encodeEither(schema)({ a: 1 }), { a: "1" })
    await Util.assertions.either.fail(
      S.encodeEither(schema)({ a: 10 }).pipe(Either.mapLeft((e) => e.issue)),
      `{ readonly a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
    )
  })

  it("should return an error on async", async () => {
    await Util.assertions.either.fail(
      S.encodeEither(Util.AsyncString)("a").pipe(Either.mapLeft((e) => e.issue)),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.assertions.either.fail(
      S.encodeEither(schema)(input, { onExcessProperty: "error" }).pipe(Either.mapLeft((e) => e.issue)),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.either.fail(
      S.encodeEither(schema, { onExcessProperty: "error" })(input).pipe(Either.mapLeft((e) => e.issue)),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.assertions.either.right(
      S.encodeEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: "1" }
    )
  })
})
