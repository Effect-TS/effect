import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > union", () => {
  it("annotations()", () => {
    const schema = S.Union(S.String, S.Number).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the members", () => {
    const schema = S.Union(S.String, S.Number)
    expect(schema.members).toStrictEqual([S.String, S.Number])
  })

  describe("decoding", () => {
    it("should use identifier annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.Union(
        S.Struct({ a: S.String }).annotations({ identifier: "MyDataType1" }),
        S.Struct({ a: S.String }).annotations({ identifier: "MyDataType2" })
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `MyDataType1 | MyDataType2
├─ Union member
│  └─ Expected MyDataType1, actual null
└─ Union member
   └─ Expected MyDataType2, actual null`
      )
    })

    it("empty union", async () => {
      const schema = S.Union()
      await Util.expectDecodeUnknownFailure(schema, 1, "Expected never, actual 1")
    })

    it("members with literals but the input doesn't have any", async () => {
      const schema = S.Union(
        S.Struct({ a: S.literal(1), c: S.String }),
        S.Struct({ b: S.literal(2), d: S.Number })
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { a: 1; c: string } | { b: 2; d: number }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ a: 1; c: string } | { b: 2; d: number }
├─ { a: 1 }
│  └─ ["a"]
│     └─ is missing
└─ { b: 2 }
   └─ ["b"]
      └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: null },
        `{ a: 1; c: string } | { b: 2; d: number }
├─ { a: 1 }
│  └─ ["a"]
│     └─ Expected 1, actual null
└─ { b: 2 }
   └─ ["b"]
      └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: 3 },
        `{ a: 1; c: string } | { b: 2; d: number }
├─ { a: 1 }
│  └─ ["a"]
│     └─ is missing
└─ { b: 2 }
   └─ ["b"]
      └─ Expected 2, actual 3`
      )
    })

    it("members with multiple tags", async () => {
      const schema = S.Union(
        S.Struct({ category: S.literal("catA"), tag: S.literal("a") }),
        S.Struct({ category: S.literal("catA"), tag: S.literal("b") }),
        S.Struct({ category: S.literal("catA"), tag: S.literal("c") })
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { category: "catA"; tag: "a" } | { category: "catA"; tag: "b" } | { category: "catA"; tag: "c" }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ category: "catA"; tag: "a" } | { category: "catA"; tag: "b" } | { category: "catA"; tag: "c" }
├─ { category: "catA" }
│  └─ ["category"]
│     └─ is missing
└─ { tag: "b" | "c" }
   └─ ["tag"]
      └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { category: null },
        `{ category: "catA"; tag: "a" } | { category: "catA"; tag: "b" } | { category: "catA"; tag: "c" }
├─ { category: "catA" }
│  └─ ["category"]
│     └─ Expected "catA", actual null
└─ { tag: "b" | "c" }
   └─ ["tag"]
      └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { tag: "d" },
        `{ category: "catA"; tag: "a" } | { category: "catA"; tag: "b" } | { category: "catA"; tag: "c" }
├─ { category: "catA" }
│  └─ ["category"]
│     └─ is missing
└─ { tag: "b" | "c" }
   └─ ["tag"]
      └─ Expected "b" | "c", actual "d"`
      )
    })

    it("nested unions", async () => {
      const a = S.Struct({ _tag: S.literal("a") }).annotations({ identifier: "a" })
      const b = S.Struct({ _tag: S.literal("b") }).annotations({ identifier: "b" })
      const A = S.Struct({ a: S.literal("A"), c: S.String }).annotations({ identifier: "A" })
      const B = S.Struct({ b: S.literal("B"), d: S.Number }).annotations({ identifier: "B" })
      const ab = S.Union(a, b).annotations({ identifier: "ab" })
      const AB = S.Union(A, B).annotations({ identifier: "AB" })
      const schema = S.Union(ab, AB)
      await Util.expectDecodeUnknownSuccess(schema, { _tag: "a" })
      await Util.expectDecodeUnknownSuccess(schema, { _tag: "b" })
      await Util.expectDecodeUnknownSuccess(schema, { a: "A", c: "c" })
      await Util.expectDecodeUnknownSuccess(schema, { b: "B", d: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `ab | AB
├─ Union member
│  └─ ab
│     └─ { _tag: "a" | "b" }
│        └─ ["_tag"]
│           └─ is missing
└─ Union member
   └─ AB
      ├─ { a: "A" }
      │  └─ ["a"]
      │     └─ is missing
      └─ { b: "B" }
         └─ ["b"]
            └─ is missing`
      )
    })
  })

  describe("encoding", () => {
    it("union", async () => {
      const schema = S.Union(S.String, Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, "a", "a")
      await Util.expectEncodeSuccess(schema, 1, "1")
    })

    it("union/ optional property signatures", async () => {
      const ab = S.Struct({ a: S.String, b: S.optional(S.Number, { exact: true }) })
      const ac = S.Struct({ a: S.String, c: S.optional(S.Number, { exact: true }) })
      const schema = S.Union(ab, ac)
      await Util.expectEncodeSuccess(
        schema,
        { a: "a", c: 1 },
        { a: "a" }
      )
      await Util.expectEncodeSuccess(
        schema,
        { a: "a", c: 1 },
        { a: "a", c: 1 },
        Util.onExcessPropertyError
      )
    })
  })
})
