import { describe, it } from "@effect/vitest"
import { strictEqual, throws } from "@effect/vitest/utils"
import { identity } from "effect/Function"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("required", () => {
  it("string", () => {
    strictEqual(S.required(S.String).ast, S.String.ast)
  })

  it("Struct", async () => {
    const schema = S.required(S.Struct({
      a: S.optionalWith(S.NumberFromString.pipe(S.greaterThan(0)), { exact: true })
    }))

    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
    await Util.assertions.decoding.fail(
      schema,
      {},
      `{ readonly a: greaterThan(0) }
└─ ["a"]
   └─ is missing`
    )
    await Util.assertions.decoding.fail(
      schema,
      { a: "-1" },
      `{ readonly a: greaterThan(0) }
└─ ["a"]
   └─ greaterThan(0)
      └─ Predicate refinement failure
         └─ Expected a positive number, actual -1`
    )
  })

  describe("Tuple", () => {
    it("e?", async () => {
      // type A = readonly [string?]
      // type B = Required<A>

      const A = S.Tuple(S.optionalElement(S.NumberFromString))
      const B = S.required(A)

      await Util.assertions.decoding.succeed(B, ["1"], [1])
      await Util.assertions.decoding.fail(
        B,
        [],
        `readonly [NumberFromString]
└─ [0]
   └─ is missing`
      )
    })

    it("e e?", async () => {
      // type A = readonly [number, string?]
      // type B = Required<A>

      const A = S.Tuple(S.NumberFromString, S.optionalElement(S.String))
      const B = S.required(A)

      await Util.assertions.decoding.succeed(B, ["0", ""], [0, ""])
      await Util.assertions.decoding.fail(
        B,
        ["0"],
        `readonly [NumberFromString, string]
└─ [1]
   └─ is missing`
      )
    })

    it("e r e", async () => {
      // type A = readonly [string, ...Array<number>, boolean]
      // type B = Required<A> // readonly [string, ...number[], boolean]

      const A = S.Tuple([S.String], S.Number, S.Boolean)
      const B = S.required(A)

      await Util.assertions.decoding.succeed(B, ["", true], ["", true])
      await Util.assertions.decoding.succeed(B, ["", 0, true])
      await Util.assertions.decoding.succeed(B, ["", 0, 1, true])

      await Util.assertions.decoding.fail(
        B,
        [],
        `readonly [string, ...number[], boolean]
└─ [0]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        B,
        [""],
        `readonly [string, ...number[], boolean]
└─ [1]
   └─ is missing`
      )
    })

    it("e r e e", async () => {
      // type A = readonly [string, ...Array<number>, boolean, boolean]
      // type B = Required<A> // readonly [string, ...number[], boolean, boolean]

      const A = S.Tuple([S.String], S.Number, S.Boolean, S.Boolean)
      const B = S.required(A)

      await Util.assertions.decoding.succeed(B, ["", 0, true, false])
      await Util.assertions.decoding.succeed(B, ["", 0, 1, 2, 3, true, false])

      await Util.assertions.decoding.fail(
        B,
        [],
        `readonly [string, ...number[], boolean, boolean]
└─ [0]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        B,
        [""],
        `readonly [string, ...number[], boolean, boolean]
└─ [1]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        B,
        ["", true],
        `readonly [string, ...number[], boolean, boolean]
└─ [2]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        B,
        ["", 0, true],
        `readonly [string, ...number[], boolean, boolean]
└─ [1]
   └─ Expected boolean, actual 0`
      )
    })
  })

  it("Union", async () => {
    const schema = S.required(S.Union(
      S.Struct({ a: S.optionalWith(S.String, { exact: true }) }),
      S.Struct({ b: S.optionalWith(S.Number, { exact: true }) })
    ))
    await Util.assertions.decoding.succeed(schema, { a: "a" })
    await Util.assertions.decoding.succeed(schema, { b: 1 })
    await Util.assertions.decoding.fail(
      schema,
      {},
      `{ readonly a: string } | { readonly b: number }
├─ { readonly a: string }
│  └─ ["a"]
│     └─ is missing
└─ { readonly b: number }
   └─ ["b"]
      └─ is missing`
    )
  })

  it("suspend", async () => {
    interface A {
      readonly a: null | A
    }
    const schema: S.Schema<A> = S.required(S.suspend( // intended outer suspend
      () =>
        S.Struct({
          a: S.optionalWith(S.Union(schema, S.Null), { exact: true })
        })
    ))
    await Util.assertions.decoding.succeed(schema, { a: null })
    await Util.assertions.decoding.succeed(schema, { a: { a: null } })
    await Util.assertions.decoding.fail(
      schema,
      {},
      `{ readonly a: <suspended schema> | null }
└─ ["a"]
   └─ is missing`
    )
    await Util.assertions.decoding.fail(
      schema,
      { a: {} },
      `{ readonly a: <suspended schema> | null }
└─ ["a"]
   └─ <suspended schema> | null
      ├─ { readonly a: <suspended schema> | null }
      │  └─ ["a"]
      │     └─ is missing
      └─ Expected null, actual {}`
    )
  })

  describe("unsupported schemas", () => {
    it("declarations should throw", async () => {
      throws(
        () => S.required(S.OptionFromSelf(S.String)),
        new Error(`Unsupported schema
schema (Declaration): Option<string>`)
      )
    })

    it("refinements should throw", async () => {
      throws(
        () => S.required(S.String.pipe(S.minLength(2))),
        new Error(`Unsupported schema
schema (Refinement): minLength(2)`)
      )
    })

    describe("Transformation", () => {
      it("should support property key renamings", () => {
        const original = S.Struct({
          a: S.String,
          b: S.propertySignature(S.String).pipe(S.fromKey("c"))
        })
        const schema = S.required(S.partial(original))
        strictEqual(
          S.format(schema),
          "({ readonly a: string | undefined; readonly c: string | undefined } <-> { readonly a: string | undefined; readonly b: string | undefined })"
        )
      })

      it("transformations should throw", async () => {
        throws(
          () => S.required(S.transform(S.String, S.String, { strict: true, decode: identity, encode: identity })),
          new Error(`Unsupported schema
schema (Transformation): (string <-> string)`)
        )
      })
    })
  })
})
