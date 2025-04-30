import { describe, it } from "@effect/vitest"
import { strictEqual, throws } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("partial", () => {
  it("Struct", async () => {
    const schema = S.partial(S.Struct({ a: S.Number }))
    await Util.assertions.decoding.succeed(schema, {})
    await Util.assertions.decoding.succeed(schema, { a: 1 })
    await Util.assertions.decoding.succeed(schema, { a: undefined })

    await Util.assertions.decoding.fail(
      schema,
      { a: null },
      `{ readonly a?: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual null
      └─ Expected undefined, actual null`
    )
  })

  it("Record", async () => {
    const schema = S.partial(S.Record({ key: S.String, value: S.NumberFromString }))
    await Util.assertions.decoding.succeed(schema, {}, {})
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
    await Util.assertions.decoding.succeed(schema, { a: undefined })
  })

  describe("Tuple", () => {
    it("e", async () => {
      const schema = S.partial(S.Tuple(S.NumberFromString))
      await Util.assertions.decoding.succeed(schema, ["1"], [1])
      await Util.assertions.decoding.succeed(schema, [], [])
      await Util.assertions.decoding.succeed(schema, [undefined])
    })

    it("e r", async () => {
      const schema = S.partial(S.Tuple([S.NumberFromString], S.NumberFromString))
      await Util.assertions.decoding.succeed(schema, ["1"], [1])
      await Util.assertions.decoding.succeed(schema, [], [])
      await Util.assertions.decoding.succeed(schema, ["1", "2"], [1, 2])
      await Util.assertions.decoding.succeed(schema, ["1", undefined], [1, undefined])
      await Util.assertions.decoding.succeed(schema, [undefined])
    })
  })

  it("Array", async () => {
    const schema = S.partial(S.Array(S.Number))
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

  describe("unsupported schemas", () => {
    it("declarations should throw", () => {
      throws(
        () => S.partial(S.OptionFromSelf(S.String)),
        new Error(`Unsupported schema
schema (Declaration): Option<string>`)
      )
    })

    it("refinements should throw", () => {
      throws(
        () => S.partial(S.String.pipe(S.minLength(2))),
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
        const schema = S.partial(original)
        strictEqual(
          S.format(schema),
          "({ readonly a?: string | undefined; readonly c?: string | undefined } <-> { readonly a?: string | undefined; readonly b?: string | undefined })"
        )
        await Util.assertions.decoding.succeed(schema, {})
        await Util.assertions.decoding.succeed(schema, { a: undefined })
        await Util.assertions.decoding.succeed(schema, { c: undefined }, { b: undefined })
        await Util.assertions.decoding.succeed(schema, { a: "a" })
        await Util.assertions.decoding.succeed(schema, { c: "b" }, { b: "b" })
        await Util.assertions.decoding.succeed(schema, { a: undefined, c: undefined }, { a: undefined, b: undefined })
        await Util.assertions.decoding.succeed(schema, { a: "a", c: undefined }, { a: "a", b: undefined })
        await Util.assertions.decoding.succeed(schema, { a: undefined, c: "b" }, { a: undefined, b: "b" })
        await Util.assertions.decoding.succeed(schema, { a: "a", c: "b" }, { a: "a", b: "b" })
      })
    })
  })
})
