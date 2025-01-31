import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("encode", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return an error on invalid values", async () => {
    await Util.assertions.effect.succeed(S.encode(schema)({ a: 1 }), { a: "1" })
    await Util.assertions.effect.fail(
      S.encode(schema)({ a: 10 }).pipe(Effect.mapError((e) => e.issue)),
      `{ readonly a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.assertions.effect.fail(
      S.encode(schema)(input, { onExcessProperty: "error" }).pipe(Effect.mapError((e) => e.issue)),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.effect.fail(
      S.encode(schema, { onExcessProperty: "error" })(input).pipe(Effect.mapError((e) => e.issue)),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.effect.succeed(
      S.encode(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: "1"
      }
    )
  })
})
