import { describe, it } from "@effect/vitest"
import * as Either from "effect/Either"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("validateEither", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return an error on invalid values", async () => {
    Util.assertions.either.right(S.validateEither(schema)({ a: 1 }), { a: 1 })
    await Util.assertions.either.fail(
      S.validateEither(schema)({ a: null }).pipe(Either.mapLeft((e) => e.issue)),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should return an error on async", async () => {
    await Util.assertions.either.fail(
      S.encodeEither(Util.AsyncDeclaration)("a").pipe(Either.mapLeft((e) => e.issue)),
      `AsyncDeclaration
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.assertions.either.fail(
      S.validateEither(schema)(input, { onExcessProperty: "error" }).pipe(Either.mapLeft((e) => e.issue)),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.either.fail(
      S.validateEither(schema, { onExcessProperty: "error" })(input).pipe(Either.mapLeft((e) => e.issue)),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.assertions.either.right(
      S.validateEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: 1 }
    )
  })
})
