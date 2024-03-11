import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > union", () => {
  it("annotations()", () => {
    const schema = S.union(S.string, S.number).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the members", () => {
    const schema = S.union(S.string, S.number)
    expect(schema.members).toStrictEqual([S.string, S.number])
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.union(
        S.struct({ a: S.string }).annotations({ identifier: "MyDataType1" }),
        S.struct({ a: S.string }).annotations({ identifier: "MyDataType2" })
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
      const schema = S.union()
      await Util.expectDecodeUnknownFailure(schema, 1, "Expected never, actual 1")
    })

    it("members with literals but the input doesn't have any", async () => {
      const schema = S.union(
        S.struct({ a: S.literal(1), c: S.string }),
        S.struct({ b: S.literal(2), d: S.number })
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
      const schema = S.union(
        S.struct({ category: S.literal("catA"), tag: S.literal("a") }),
        S.struct({ category: S.literal("catA"), tag: S.literal("b") }),
        S.struct({ category: S.literal("catA"), tag: S.literal("c") })
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

    it("union/required property signatures: should return the best output", async () => {
      const a = S.struct({ a: S.string })
      const ab = S.struct({ a: S.string, b: S.number })
      const schema = S.union(a, ab)
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: 1 })
    })

    it("union/optional property signatures: should return the best output", async () => {
      const ab = S.struct({ a: S.string, b: S.optional(S.number, { exact: true }) })
      const ac = S.struct({ a: S.string, c: S.optional(S.number, { exact: true }) })
      const schema = S.union(ab, ac)
      await Util.expectDecodeUnknownSuccess(
        schema,
        { a: "a", c: 1 },
        { a: "a" }
      )
      await Util.expectDecodeUnknownSuccess(
        schema,
        { a: "a", c: 1 },
        { a: "a", c: 1 },
        Util.onExcessPropertyError
      )
    })
  })

  describe("encoding", () => {
    it("union", async () => {
      const schema = S.union(S.string, Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, "a", "a")
      await Util.expectEncodeSuccess(schema, 1, "1")
    })

    it("union/ more required property signatures", async () => {
      const a = S.struct({ a: S.string })
      const ab = S.struct({ a: S.string, b: S.number })
      const schema = S.union(a, ab)
      await Util.expectEncodeSuccess(schema, { a: "a", b: 1 }, { a: "a", b: 1 })
    })

    it("union/ optional property signatures", async () => {
      const ab = S.struct({ a: S.string, b: S.optional(S.number, { exact: true }) })
      const ac = S.struct({ a: S.string, c: S.optional(S.number, { exact: true }) })
      const schema = S.union(ab, ac)
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
