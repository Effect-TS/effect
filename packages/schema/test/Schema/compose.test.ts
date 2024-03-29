import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > compose", async () => {
  it("B = C", async () => {
    const schema1 = S.compose(S.split(","), S.array(S.NumberFromString))
    await Util.expectDecodeUnknownSuccess(schema1, "1,2,3", [1, 2, 3])
    const schema2 = S.split(",").pipe(S.compose(S.array(S.NumberFromString)))
    await Util.expectDecodeUnknownSuccess(schema2, "1,2,3", [1, 2, 3])
  })

  it("force decoding: (A U B) compose (B -> C)", async () => {
    const schema1 = S.compose(S.union(S.string, S.null), S.NumberFromString, { strict: false })
    await Util.expectDecodeUnknownSuccess(schema1, "1", 1)
    await Util.expectDecodeUnknownFailure(
      schema1,
      "a",
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Transformation process failure
         └─ Expected NumberFromString, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema1,
      null,
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected a string, actual null`
    )
    const schema2 = S.union(S.string, S.null).pipe(
      S.compose(S.NumberFromString, { strict: false })
    )
    await Util.expectDecodeUnknownSuccess(schema2, "1", 1)
    await Util.expectDecodeUnknownFailure(
      schema2,
      "a",
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Transformation process failure
         └─ Expected NumberFromString, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema2,
      null,
      `(string | null <-> NumberFromString)
└─ Type side transformation failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected a string, actual null`
    )
  })

  it("force encoding: (A -> B) compose (C U B)", async () => {
    const schema1 = S.compose(S.NumberFromString, S.union(S.number, S.null), { strict: false })
    await Util.expectEncodeSuccess(schema1, 1, "1")
    await Util.expectEncodeFailure(
      schema1,
      null,
      `(NumberFromString <-> number | null)
└─ Encoded side transformation failure
   └─ NumberFromString
      └─ Type side transformation failure
         └─ Expected a number, actual null`
    )
    const schema2 = S.NumberFromString.pipe(
      S.compose(S.union(S.number, S.null), { strict: false })
    )
    await Util.expectEncodeSuccess(schema2, 1, "1")
    await Util.expectEncodeFailure(
      schema2,
      null,
      `(NumberFromString <-> number | null)
└─ Encoded side transformation failure
   └─ NumberFromString
      └─ Type side transformation failure
         └─ Expected a number, actual null`
    )
  })
})
