import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("validate", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return an error on invalid values", async () => {
    await Util.assertions.effect.succeed(S.validate(schema)({ a: 1 }), { a: 1 })
    await Util.assertions.effect.fail(
      S.validate(schema)({ a: null }).pipe(Effect.mapError((e) => e.issue)),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.assertions.effect.fail(
      S.validate(schema)(input, { onExcessProperty: "error" }).pipe(Effect.mapError((e) => e.issue)),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.effect.fail(
      S.validate(schema, { onExcessProperty: "error" })(input).pipe(Effect.mapError((e) => e.issue)),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.effect.succeed(
      S.validate(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })
})
