import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("compose", async () => {
  it("B = C", async () => {
    const schema1 = S.compose(S.split(","), S.Array(S.NumberFromString))
    await Util.assertions.decoding.succeed(schema1, "1,2,3", [1, 2, 3])
    const schema2 = S.split(",").pipe(S.compose(S.Array(S.NumberFromString)))
    await Util.assertions.decoding.succeed(schema2, "1,2,3", [1, 2, 3])
  })

  it("force decoding: (A U B) compose (B -> C)", async () => {
    const schema1 = S.compose(S.Union(S.String, S.Null), S.NumberFromString, { strict: false })
    await Util.assertions.decoding.succeed(schema1, "1", 1)
    await Util.assertions.decoding.fail(
      schema1,
      "a",
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Transformation process failure
         └─ Unable to decode "a" into a number`
    )
    await Util.assertions.decoding.fail(
      schema1,
      null,
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected string, actual null`
    )
    const schema2 = S.Union(S.String, S.Null).pipe(
      S.compose(S.NumberFromString, { strict: false })
    )
    await Util.assertions.decoding.succeed(schema2, "1", 1)
    await Util.assertions.decoding.fail(
      schema2,
      "a",
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Transformation process failure
         └─ Unable to decode "a" into a number`
    )
    await Util.assertions.decoding.fail(
      schema2,
      null,
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected string, actual null`
    )
  })

  it("force encoding: (A -> B) compose (C U B)", async () => {
    const schema1 = S.compose(S.NumberFromString, S.Union(S.Number, S.Null), { strict: false })
    await Util.assertions.encoding.succeed(schema1, 1, "1")
    await Util.assertions.encoding.fail(
      schema1,
      null,
      `(NumberFromString <-> number | null)
└─ Encoded side transformation failure
   └─ NumberFromString
      └─ Type side transformation failure
         └─ Expected number, actual null`
    )
    const schema2 = S.NumberFromString.pipe(
      S.compose(S.Union(S.Number, S.Null), { strict: false })
    )
    await Util.assertions.encoding.succeed(schema2, 1, "1")
    await Util.assertions.encoding.fail(
      schema2,
      null,
      `(NumberFromString <-> number | null)
└─ Encoded side transformation failure
   └─ NumberFromString
      └─ Type side transformation failure
         └─ Expected number, actual null`
    )
  })
})
