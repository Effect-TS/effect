import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("trim", () => {
  it("test roundtrip consistency", () => {
    const schema = S.Trim
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.minLength(1), S.compose(S.Trim)).annotations({ identifier: "MySchema" })
    await Util.assertions.decoding.succeed(schema, "a", "a")
    await Util.assertions.decoding.succeed(schema, "a ", "a")
    await Util.assertions.decoding.succeed(schema, " a ", "a")
    await Util.assertions.decoding.succeed(schema, " ", "")

    await Util.assertions.decoding.fail(
      schema,
      "",
      `MySchema
└─ Encoded side transformation failure
   └─ minLength(1)
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
    )
  })

  it("encoding", async () => {
    const schema = S.String.pipe(S.minLength(1), S.compose(S.Trim)).annotations({ identifier: "MySchema" })
    await Util.assertions.encoding.succeed(schema, "a", "a")

    await Util.assertions.encoding.fail(
      schema,
      "",
      `MySchema
└─ Encoded side transformation failure
   └─ minLength(1)
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
    )
    await Util.assertions.encoding.fail(
      schema,
      " a",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual " a"`
    )
    await Util.assertions.encoding.fail(
      schema,
      "a ",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual "a "`
    )
    await Util.assertions.encoding.fail(
      schema,
      " a ",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual " a "`
    )
    await Util.assertions.encoding.fail(
      schema,
      " ",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual " "`
    )
  })
})
