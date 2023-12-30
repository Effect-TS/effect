import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as _ from "@effect/schema/TreeFormatter"
import { describe, expect, it } from "vitest"

describe("formatErrors", () => {
  it("forbidden", async () => {
    const schema = Util.effectify(S.struct({ a: S.string }))
    expect(() => S.parseSync(schema)({ a: "a" })).toThrow(
      new Error(`{ a: (string <-> string) }
└─ ["a"]
   └─ is forbidden`)
    )
  })

  it("missing", async () => {
    const schema = S.struct({ a: S.string })
    await Util.expectParseFailure(
      schema,
      {},
      `{ a: string }
└─ ["a"]
   └─ is missing`
    )
  })

  it("excess property", async () => {
    const schema = S.struct({ a: S.string })
    await Util.expectParseFailure(
      schema,
      { a: "a", b: 1 },
      `{ a: string }
└─ ["b"]
   └─ is unexpected, expected "a"`,
      Util.onExcessPropertyError
    )
  })

  it("no identifiers", async () => {
    const schema = S.struct({
      a: S.string,
      b: S.string
    })

    await Util.expectParseFailure(
      schema,
      { a: 1, b: 2 },
      `{ a: string; b: string }
├─ ["a"]
│  └─ Expected string, actual 1
└─ ["b"]
   └─ Expected string, actual 2`,
      Util.allErrors
    )
  })

  it("with identifiers", async () => {
    const schema = S.struct({
      a: S.string.pipe(S.identifier("MyString1")),
      b: S.string.pipe(S.identifier("MyString2"))
    }).pipe(S.identifier("MySchema"))

    await Util.expectParseFailure(
      schema,
      { a: 1, b: 2 },
      `MySchema
├─ ["a"]
│  └─ Expected MyString1, actual 1
└─ ["b"]
   └─ Expected MyString2, actual 2`,
      Util.allErrors
    )
  })
})
