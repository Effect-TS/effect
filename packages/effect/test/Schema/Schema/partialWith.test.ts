import { describe, it } from "@effect/vitest"
import { strictEqual, throws } from "@effect/vitest/utils"
import { identity } from "effect/Function"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("partialWith", () => {
  describe("{ exact: true }", () => {
    it("Struct", async () => {
      const schema = S.partialWith(S.Struct({ a: S.Number }), { exact: true })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { a: 1 })

      await Util.assertions.decoding.fail(
        schema,
        { a: undefined },
        `{ readonly a?: number }
└─ ["a"]
   └─ Expected number, actual undefined`
      )
    })

    it("Record", async () => {
      const schema = S.partialWith(S.Record({ key: S.String, value: S.NumberFromString }), { exact: true })
      await Util.assertions.decoding.succeed(schema, {}, {})
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.succeed(schema, { a: undefined })
    })

    describe("Tuple", () => {
      it("e", async () => {
        const schema = S.partialWith(S.Tuple(S.NumberFromString), { exact: true })
        await Util.assertions.decoding.succeed(schema, ["1"], [1])
        await Util.assertions.decoding.succeed(schema, [], [])

        await Util.assertions.decoding.fail(
          schema,
          [undefined],
          `readonly [NumberFromString?]
└─ [0]
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected string, actual undefined`
        )
      })

      it("e + r", async () => {
        const schema = S.partialWith(S.Tuple([S.NumberFromString], S.NumberFromString), { exact: true })
        await Util.assertions.decoding.succeed(schema, ["1"], [1])
        await Util.assertions.decoding.succeed(schema, [], [])
        await Util.assertions.decoding.succeed(schema, ["1", "2"], [1, 2])
        await Util.assertions.decoding.succeed(schema, ["1", undefined], [1, undefined])

        await Util.assertions.decoding.fail(
          schema,
          [undefined],
          `readonly [NumberFromString?, ...(NumberFromString | undefined)[]]
└─ [0]
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected string, actual undefined`
        )
      })
    })

    it("Array", async () => {
      const schema = S.partialWith(S.Array(S.Number), { exact: true })
      await Util.assertions.decoding.succeed(schema, [])
      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, [undefined])

      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `ReadonlyArray<number | undefined>
└─ [0]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
    })

    it("Union", async () => {
      const schema = S.partialWith(S.Union(S.Array(S.Number), S.String), { exact: true })
      await Util.assertions.decoding.succeed(schema, "a")
      await Util.assertions.decoding.succeed(schema, [])
      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, [undefined])

      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `ReadonlyArray<number | undefined> | string
├─ ReadonlyArray<number | undefined>
│  └─ [0]
│     └─ number | undefined
│        ├─ Expected number, actual "a"
│        └─ Expected undefined, actual "a"
└─ Expected string, actual ["a"]`
      )
    })

    it("suspend", async () => {
      interface A {
        readonly a?: null | A
      }
      const schema: S.Schema<A> = S.partialWith(
        S.suspend( // intended outer suspend
          () =>
            S.Struct({
              a: S.Union(schema, S.Null)
            })
        ),
        { exact: true }
      )
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { a: null })
      await Util.assertions.decoding.succeed(schema, { a: {} })
      await Util.assertions.decoding.succeed(schema, { a: { a: null } })
      await Util.assertions.decoding.fail(
        schema,
        { a: 1 },
        `{ readonly a?: <suspended schema> | null }
└─ ["a"]
   └─ <suspended schema> | null
      ├─ Expected { readonly a?: <suspended schema> | null }, actual 1
      └─ Expected null, actual 1`
      )
    })
  })

  describe("unsupported schemas", () => {
    it("declarations should throw", () => {
      throws(
        () => S.partialWith(S.OptionFromSelf(S.String), { exact: true }),
        new Error(`Unsupported schema
schema (Declaration): Option<string>`)
      )
    })

    it("refinements should throw", () => {
      throws(
        () => S.partialWith(S.String.pipe(S.minLength(2)), { exact: true }),
        new Error(`Unsupported schema
schema (Refinement): minLength(2)`)
      )
    })

    describe("Transformation", () => {
      it("should support property key renamings", async () => {
        const original = S.Struct({
          a: S.String,
          b: S.propertySignature(S.String).pipe(S.fromKey("c"))
        })
        const schema = S.partialWith(original, { exact: true })
        strictEqual(
          S.format(schema),
          "({ readonly a?: string; readonly c?: string } <-> { readonly a?: string; readonly b?: string })"
        )
        await Util.assertions.decoding.succeed(schema, {})
        await Util.assertions.decoding.succeed(schema, { a: "a" })
        await Util.assertions.decoding.succeed(schema, { c: "b" }, { b: "b" })
        await Util.assertions.decoding.succeed(schema, { a: "a", c: "b" }, { a: "a", b: "b" })
      })

      it("transformations should throw", () => {
        throws(
          () =>
            S.partialWith(S.transform(S.String, S.String, { strict: true, decode: identity, encode: identity }), {
              exact: true
            }),
          new Error(`Unsupported schema
schema (Transformation): (string <-> string)`)
        )
      })
    })
  })
})
