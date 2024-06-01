import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("encodedBoundSchema", () => {
  it("refinements", async () => {
    const StringFromStruct = S.transform(
      S.Struct({ value: S.String }).annotations({ identifier: "ValueStruct" }),
      S.String,
      {
        encode: (name) => ({ value: name }),
        decode: (nameInForm) => nameInForm.value
      }
    ).annotations({ identifier: "StringFromStruct" })

    const Handle = S.String.pipe(
      S.minLength(3),
      S.pattern(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/)
    ).annotations({ identifier: "Handle" })

    const FullSchema = S.Struct({
      names: S.NonEmptyArray(StringFromStruct),
      handle: Handle
    }).annotations({ identifier: "FullSchema" })

    const schema = S.encodedBoundSchema(FullSchema)

    await Util.expectDecodeUnknownSuccess(schema, {
      names: [{ value: "Name #1" }],
      handle: "user123"
    })

    await Util.expectDecodeUnknownFailure(
      schema,
      {
        names: [{ value: "Name #1" }],
        handle: "aa"
      },
      `{ readonly names: readonly [ValueStruct, ...ValueStruct[]]; readonly handle: Handle }
└─ ["handle"]
   └─ Handle
      └─ From side refinement failure
         └─ a string at least 3 character(s) long
            └─ Predicate refinement failure
               └─ Expected a string at least 3 character(s) long, actual "aa"`
    )
  })
})
