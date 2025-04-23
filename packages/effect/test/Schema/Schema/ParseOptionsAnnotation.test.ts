import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

const String = S.transform(S.NonEmptyString, S.String, { strict: true, decode: (s) => s, encode: (s) => s })
  .annotations({
    identifier: "string"
  })

describe("ParseOptionsAnnotation", () => {
  it("nested structs", async () => {
    const schema = S.Struct({
      a: S.Struct({
        b: String,
        c: String
      }).annotations({ parseOptions: { errors: "first" } }),
      d: String
    }).annotations({ parseOptions: { errors: "all" } })
    await Util.assertions.decoding.fail(
      schema,
      { a: {} },
      `{ readonly a: { readonly b: string; readonly c: string }; readonly d: string }
├─ ["a"]
│  └─ { readonly b: string; readonly c: string }
│     └─ ["b"]
│        └─ is missing
└─ ["d"]
   └─ is missing`,
      { parseOptions: { errors: "first" } }
    )

    await Util.assertions.encoding.fail(
      schema,
      { a: { b: "", c: "" }, d: "" },
      `{ readonly a: { readonly b: string; readonly c: string }; readonly d: string }
├─ ["a"]
│  └─ { readonly b: string; readonly c: string }
│     └─ ["b"]
│        └─ string
│           └─ Encoded side transformation failure
│              └─ NonEmptyString
│                 └─ Predicate refinement failure
│                    └─ Expected a non empty string, actual ""
└─ ["d"]
   └─ string
      └─ Encoded side transformation failure
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`,
      { parseOptions: { errors: "first" } }
    )
  })
})
