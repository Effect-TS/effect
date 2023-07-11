import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("onExcess", () => {
  it("ignore should not change tuple behaviour", async () => {
    const schema = S.tuple(S.number)
    await Util.expectParseFailure(schema, [1, "b"], "/1 is unexpected")
    await Util.expectEncodeFailure(
      schema,
      [1, "b"] as any,
      `/1 is unexpected`
    )
  })

  describe.concurrent("union should choose the output with more info", () => {
    it("structs", async () => {
      const a = S.struct({ a: S.optional(S.number) })
      const b = S.struct({ a: S.optional(S.number), b: S.optional(S.string) })
      const schema = S.union(a, b)
      await Util.expectParseSuccess(
        schema,
        { a: 1, b: "b", c: true },
        { a: 1, b: "b" }
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, b: "b", c: true },
        `union member: /c is unexpected, union member: /b is unexpected`,
        Util.onExcessPropertyError
      )
      await Util.expectEncodeSuccess(
        schema,
        { a: 1, b: "b" },
        { a: 1, b: "b" }
      )
      await Util.expectEncodeSuccess(
        schema,
        { a: 1, b: "b" },
        { a: 1, b: "b" },
        Util.onExcessPropertyError
      )
    })

    it("tuples", async () => {
      const a = S.tuple(S.number)
      const b = S.tuple(S.number).pipe(S.optionalElement(S.string))
      const schema = S.union(a, b)
      await Util.expectParseFailure(
        schema,
        [1, "b", true],
        `union member: /2 is unexpected, union member: /1 is unexpected`
      )
      await Util.expectParseFailure(
        schema,
        [1, "b", true],
        `union member: /2 is unexpected, union member: /1 is unexpected`,
        Util.onExcessPropertyError
      )
      await Util.expectEncodeSuccess(
        schema,
        [1, "b"],
        [1, "b"]
      )
      await Util.expectEncodeSuccess(
        schema,
        [1, "b"],
        [1, "b"],
        Util.onExcessPropertyError
      )
    })
  })

  describe.concurrent(`onExcessProperty = "ignore" option`, () => {
    it("tuple of a struct", async () => {
      const schema = S.tuple(S.struct({ b: S.number }))
      await Util.expectParseSuccess(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("tuple rest element of a struct", async () => {
      const schema = S.array(S.struct({ b: S.number }))
      await Util.expectParseSuccess(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("tuple. post rest elements of a struct", async () => {
      const schema = S.array(S.string).pipe(S.element(S.struct({ b: S.number })))
      await Util.expectParseSuccess(schema, [{ b: 1 }])
      await Util.expectParseSuccess(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("struct excess property signatures", async () => {
      const schema = S.struct({ a: S.number })
      await Util.expectParseSuccess(
        schema,
        { a: 1, b: "b" },
        { a: 1 }
      )
    })

    it("struct nested struct", async () => {
      const schema = S.struct({ a: S.struct({ b: S.number }) })
      await Util.expectParseSuccess(
        schema,
        { a: { b: 1, c: "c" } },
        {
          a: { b: 1 }
        }
      )
    })

    it("record of struct", async () => {
      const schema = S.record(S.string, S.struct({ b: S.number }))
      await Util.expectParseSuccess(
        schema,
        { a: { b: 1, c: "c" } },
        { a: { b: 1 } }
      )
    })
  })
})
