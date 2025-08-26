import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Union", () => {
  it("should expose the union members", () => {
    const schema = S.Union(S.String, S.Number)
    deepStrictEqual(schema.members, [S.String, S.Number])
  })

  it("should return a `Never` schema when no members are provided", async () => {
    const schema = S.Union()
    await Util.assertions.decoding.fail(schema, 1, "Expected never, actual 1")
  })

  describe("decoding", () => {
    it("should use identifier annotations to generate informative error messages", async () => {
      const schema = S.Union(
        S.Struct({ a: S.String }).annotations({ identifier: "ID1" }),
        S.Struct({ a: S.String }).annotations({ identifier: "ID2" })
      )
      await Util.assertions.decoding.fail(
        schema,
        null,
        `ID1 | ID2
├─ Expected ID1, actual null
└─ Expected ID2, actual null`
      )
    })

    describe("discriminated unions", () => {
      describe("structs", () => {
        it("should handle discriminators for each struct", async () => {
          const schema = S.Union(
            S.Struct({ a: S.Literal(1), c: S.String }).annotations({ identifier: "ID1" }),
            S.Struct({ b: S.Literal(2), d: S.Number }).annotations({ identifier: "ID2" })
          )
          await Util.assertions.decoding.fail(
            schema,
            null,
            `Expected ID1 | ID2, actual null`
          )
          await Util.assertions.decoding.fail(
            schema,
            {},
            `ID1 | ID2
├─ ID1
│  └─ ["a"]
│     └─ is missing
└─ ID2
   └─ ["b"]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            { a: null },
            `ID1 | ID2
├─ ID1
│  └─ ["a"]
│     └─ Expected 1, actual null
└─ ID2
   └─ ["b"]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            { b: 3 },
            `ID1 | ID2
├─ ID1
│  └─ ["a"]
│     └─ is missing
└─ ID2
   └─ ["b"]
      └─ Expected 2, actual 3`
          )
        })

        it("should handle structs with multiple discriminators", async () => {
          const schema = S.Union(
            S.Struct({ category: S.Literal("catA"), tag: S.Literal("a") }).annotations({ identifier: "IDa" }),
            S.Struct({ category: S.Literal("catA"), tag: S.Literal("b") }).annotations({ identifier: "IDb" }),
            S.Struct({ category: S.Literal("catA"), tag: S.Literal("c") }).annotations({ identifier: "IDc" })
          )
          await Util.assertions.decoding.fail(
            schema,
            null,
            `Expected IDa | IDb | IDc, actual null`
          )
          await Util.assertions.decoding.fail(
            schema,
            {},
            `IDa | IDb | IDc
├─ IDa
│  └─ ["category"]
│     └─ is missing
└─ IDb | IDc
   └─ ["tag"]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            { category: null },
            `IDa | IDb | IDc
├─ IDa
│  └─ ["category"]
│     └─ Expected "catA", actual null
└─ IDb | IDc
   └─ ["tag"]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            { tag: "d" },
            `IDa | IDb | IDc
├─ IDa
│  └─ ["category"]
│     └─ is missing
└─ IDb | IDc
   └─ ["tag"]
      └─ Expected "b" | "c", actual "d"`
          )
        })

        it("should handle nested unions", async () => {
          const a = S.Struct({ _tag: S.Literal("a") }).annotations({ identifier: "IDa" })
          const b = S.Struct({ _tag: S.Literal("b") }).annotations({ identifier: "IDb" })
          const A = S.Struct({ a: S.Literal("A"), c: S.String }).annotations({ identifier: "IDA" })
          const B = S.Struct({ b: S.Literal("B"), d: S.Number }).annotations({ identifier: "IDB" })
          const ab = S.Union(a, b).annotations({ identifier: "IDab" })
          const AB = S.Union(A, B).annotations({ identifier: "IDAB" })
          const schema = S.Union(ab, AB)
          await Util.assertions.decoding.succeed(schema, { _tag: "a" })
          await Util.assertions.decoding.succeed(schema, { _tag: "b" })
          await Util.assertions.decoding.succeed(schema, { a: "A", c: "c" })
          await Util.assertions.decoding.succeed(schema, { b: "B", d: 1 })
          await Util.assertions.decoding.fail(
            schema,
            {},
            `IDab | IDAB
├─ IDab
│  └─ { readonly _tag: "a" | "b" }
│     └─ ["_tag"]
│        └─ is missing
└─ IDAB
   ├─ IDA
   │  └─ ["a"]
   │     └─ is missing
   └─ IDB
      └─ ["b"]
         └─ is missing`
          )
        })
      })

      describe("tuples", () => {
        it("should handle discriminators for each tuple", async () => {
          const schema = S.Union(
            S.Tuple(S.Literal("a"), S.String),
            S.Tuple(S.Literal("b"), S.Number)
          ).annotations({ identifier: "ID" })

          await Util.assertions.decoding.succeed(schema, ["a", "s"])
          await Util.assertions.decoding.succeed(schema, ["b", 1])

          await Util.assertions.decoding.fail(schema, null, `Expected ID, actual null`)
          await Util.assertions.decoding.fail(
            schema,
            [],
            `ID
└─ { readonly 0: "a" | "b" }
   └─ ["0"]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            ["c"],
            `ID
└─ { readonly 0: "a" | "b" }
   └─ ["0"]
      └─ Expected "a" | "b", actual "c"`
          )
          await Util.assertions.decoding.fail(
            schema,
            ["a", 0],
            `ID
└─ readonly ["a", string]
   └─ [1]
      └─ Expected string, actual 0`
          )
        })

        it("should handle tuples with multiple discriminators", async () => {
          const schema = S.Union(
            S.Tuple(S.Literal("catA"), S.Literal("a"), S.String).annotations({ identifier: "IDa" }),
            S.Tuple(S.Literal("catA"), S.Literal("b"), S.Number).annotations({ identifier: "IDb" }),
            S.Tuple(S.Literal("catA"), S.Literal("c"), S.Boolean).annotations({ identifier: "IDc" })
          ).annotations({ identifier: "ID" })

          await Util.assertions.decoding.succeed(schema, ["catA", "a", "s"])
          await Util.assertions.decoding.succeed(schema, ["catA", "b", 1])
          await Util.assertions.decoding.succeed(schema, ["catA", "c", true])

          await Util.assertions.decoding.fail(schema, null, `Expected ID, actual null`)
          await Util.assertions.decoding.fail(
            schema,
            [],
            `ID
├─ IDa
│  └─ ["0"]
│     └─ is missing
└─ IDb | IDc
   └─ ["1"]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            ["catB"],
            `ID
├─ IDa
│  └─ ["0"]
│     └─ Expected "catA", actual "catB"
└─ IDb | IDc
   └─ ["1"]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            ["catA", "c"],
            `ID
├─ IDa
│  └─ [2]
│     └─ is missing
└─ IDc
   └─ [2]
      └─ is missing`
          )
          await Util.assertions.decoding.fail(
            schema,
            ["catA", "a", 0],
            `ID
├─ IDb | IDc
│  └─ ["1"]
│     └─ Expected "b" | "c", actual "a"
└─ IDa
   └─ [2]
      └─ Expected string, actual 0`
          )
        })

        it("should handle discriminated tuple + tuple", async () => {
          const schema = S.Union(
            S.Tuple(S.Literal(-1), S.Literal(0)).annotations({ identifier: "ID1" }),
            S.Tuple(S.NonNegativeInt, S.NonNegativeInt).annotations({ identifier: "ID2" })
          ).annotations({ identifier: "ID" })

          await Util.assertions.decoding.fail(
            schema,
            null,
            `ID
├─ Expected ID1, actual null
└─ Expected ID2, actual null`
          )
        })

        it("should handle 2 discriminated tuples + a tuple", async () => {
          const schema = S.Union(
            S.Tuple(S.Literal(-1), S.Literal(0)).annotations({ identifier: "ID1" }),
            S.Tuple(S.Literal(1), S.Literal(0)).annotations({ identifier: "ID2" }),
            S.Tuple(S.NonNegativeInt, S.NonNegativeInt).annotations({ identifier: "ID3" })
          ).annotations({ identifier: "ID" })

          await Util.assertions.decoding.fail(
            schema,
            [],
            `ID
├─ ID1 | ID2
│  └─ ["0"]
│     └─ is missing
└─ ID3
   └─ [0]
      └─ is missing`
          )
        })
      })
    })
  })

  describe("encoding", () => {
    it("should encode all members", async () => {
      const schema = S.Union(S.String, Util.NumberFromChar)
      await Util.assertions.encoding.succeed(schema, "a", "a")
      await Util.assertions.encoding.succeed(schema, 1, "1")
    })

    it("should handle members with exact optional property signatures", async () => {
      const ab = S.Struct({ a: S.String, b: S.optionalWith(S.Number, { exact: true }) })
      const ac = S.Struct({ a: S.String, c: S.optionalWith(S.Number, { exact: true }) })
      const schema = S.Union(ab, ac)
      await Util.assertions.encoding.succeed(
        schema,
        { a: "a", c: 1 },
        { a: "a" }
      )
      await Util.assertions.encoding.succeed(
        schema,
        { a: "a", c: 1 },
        { a: "a", c: 1 },
        { parseOptions: Util.onExcessPropertyError }
      )
    })
  })
})
