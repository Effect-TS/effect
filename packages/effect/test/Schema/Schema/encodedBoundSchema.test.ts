import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("encodedBoundSchema", () => {
  const StringTransformation = S.transform(
    S.String.pipe(S.minLength(2)).annotations({ identifier: "String2" }),
    S.String,
    {
      strict: true,
      encode: (s) => s,
      decode: (s) => s
    }
  ).annotations({ identifier: "StringTransformation" })

  it("struct", async () => {
    const String3 = S.String.pipe(S.minLength(3)).annotations({ identifier: "String3" })

    const schema = S.Struct({
      a: S.Array(StringTransformation),
      b: String3
    }).annotations({ identifier: "FullSchema" })

    const bound = S.encodedBoundSchema(schema)

    await Util.expectDecodeUnknownSuccess(bound, {
      a: ["ab"],
      b: "abc"
    })

    await Util.expectDecodeUnknownFailure(
      bound,
      {
        a: ["a"],
        b: "abc"
      },
      `{ readonly a: ReadonlyArray<String2>; readonly b: String3 }
└─ ["a"]
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected String2, actual "a"`
    )

    await Util.expectDecodeUnknownFailure(
      bound,
      {
        a: ["ab"],
        b: "ab"
      },
      `{ readonly a: ReadonlyArray<String2>; readonly b: String3 }
└─ ["b"]
   └─ String3
      └─ Predicate refinement failure
         └─ Expected String3, actual "ab"`
    )
  })

  describe("array stable filters", () => {
    it("minItems", async () => {
      const schema = S.Array(StringTransformation).pipe(S.minItems(2))
      const bound = S.encodedBoundSchema(schema)

      await Util.expectDecodeUnknownSuccess(bound, ["ab", "cd"])
      await Util.expectDecodeUnknownFailure(
        bound,
        ["a"],
        `{ ReadonlyArray<String2> | filter }
└─ From side refinement failure
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected String2, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        bound,
        ["ab"],
        `{ ReadonlyArray<String2> | filter }
└─ Predicate refinement failure
   └─ Expected { ReadonlyArray<String2> | filter }, actual ["ab"]`
      )
    })

    it("maxItems", async () => {
      const schema = S.Array(StringTransformation).pipe(S.maxItems(2))
      const bound = S.encodedBoundSchema(schema)

      await Util.expectDecodeUnknownSuccess(bound, ["ab", "cd"])
      await Util.expectDecodeUnknownFailure(
        bound,
        ["a"],
        `{ ReadonlyArray<String2> | filter }
└─ From side refinement failure
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected String2, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        bound,
        ["ab", "cd", "ef"],
        `{ ReadonlyArray<String2> | filter }
└─ Predicate refinement failure
   └─ Expected { ReadonlyArray<String2> | filter }, actual ["ab","cd","ef"]`
      )
    })

    it("itemsCount", async () => {
      const schema = S.Array(StringTransformation).pipe(S.itemsCount(2))
      const bound = S.encodedBoundSchema(schema)

      await Util.expectDecodeUnknownSuccess(bound, ["ab", "cd"])
      await Util.expectDecodeUnknownFailure(
        bound,
        ["a"],
        `{ ReadonlyArray<String2> | filter }
└─ From side refinement failure
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected String2, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        bound,
        ["ab"],
        `{ ReadonlyArray<String2> | filter }
└─ Predicate refinement failure
   └─ Expected { ReadonlyArray<String2> | filter }, actual ["ab"]`
      )
      await Util.expectDecodeUnknownFailure(
        bound,
        ["ab", "cd", "ef"],
        `{ ReadonlyArray<String2> | filter }
└─ Predicate refinement failure
   └─ Expected { ReadonlyArray<String2> | filter }, actual ["ab","cd","ef"]`
      )
    })
  })
})
