import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("headOrElse", () => {
  it("decoding (without fallback)", async () => {
    const schema = S.headOrElse(S.Array(S.NumberFromString))
    await Util.assertions.decoding.succeed(schema, ["1"], 1)
    await Util.assertions.decoding.fail(
      schema,
      [],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ Transformation process failure
   └─ Unable to retrieve the first element of an empty array`
    )
    await Util.assertions.decoding.fail(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ Encoded side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )
  })

  it("decoding (with fallback)", async () => {
    const schema = S.headOrElse(S.Array(S.NumberFromString), () => 0)
    await Util.assertions.decoding.succeed(schema, ["1"], 1)
    await Util.assertions.decoding.succeed(schema, [], 0)
    await Util.assertions.decoding.fail(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ Encoded side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )

    const schema2 = S.Array(S.NumberFromString).pipe(S.headOrElse(() => 0))
    await Util.assertions.decoding.succeed(schema2, ["1"], 1)
    await Util.assertions.decoding.succeed(schema2, [], 0)
  })

  it("decoding (struct)", async () => {
    const schema = S.headOrElse(
      S.Array(
        S.Struct({
          id: S.String,
          data: S.parseJson()
        })
      )
    )
    await Util.assertions.decoding.succeed(schema, [
      {
        id: "1",
        data: "{\"a\":\"a\"}"
      }
    ], { id: "1", data: { a: "a" } })
  })

  it("encoding", async () => {
    const schema = S.headOrElse(S.Array(S.Number))
    await Util.assertions.encoding.succeed(schema, 1, [1])
  })
})
