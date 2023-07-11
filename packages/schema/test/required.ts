import { identity } from "@effect/data/Function"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.NumberFromString

describe.concurrent("required", () => {
  it("string", () => {
    expect(S.required(S.string).ast).toEqual(S.string.ast)
  })

  it("struct", async () => {
    const schema = S.required(S.struct({
      a: S.optional(NumberFromString.pipe(S.greaterThan(0)))
    }))

    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(schema, {}, "/a is missing")
    await Util.expectParseFailure(
      schema,
      { a: "-1" },
      "/a Expected a number greater than 0, actual -1"
    )
  })

  it("tuple/ e?", async () => {
    // type A = [string?]
    // type B = Required<A>
    const schema = S.required(S.tuple().pipe(S.optionalElement(NumberFromString)))

    await Util.expectParseSuccess(schema, ["1"], [1])
    await Util.expectParseFailure(schema, [], "/0 is missing")
  })

  it("tuple/ e + e?", async () => {
    const schema = S.required(S.tuple(NumberFromString).pipe(S.optionalElement(S.string)))

    await Util.expectParseSuccess(schema, ["0", ""], [0, ""])
    await Util.expectParseFailure(schema, ["0"], "/1 is missing")
  })

  it("tuple/ e + r + e", async () => {
    // type A = readonly [string, ...Array<number>, boolean]
    // type B = Required<A> // [string, ...(number | boolean)[], number | boolean]

    const schema = S.required(S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean)))

    await Util.expectParseSuccess(schema, ["", 0], ["", 0])
    await Util.expectParseSuccess(schema, ["", true], ["", true])
    await Util.expectParseSuccess(schema, ["", true, 0], ["", true, 0])
    await Util.expectParseSuccess(schema, ["", 0, true], ["", 0, true])

    await Util.expectParseFailure(schema, [], "/0 is missing")
    await Util.expectParseFailure(schema, [""], "/1 is missing")
  })

  it("tuple/ e + r + 2e", async () => {
    // type A = readonly [string, ...Array<number>, boolean, boolean]
    // type B = Required<A> // [string, ...(number | boolean)[], number | boolean, number | boolean]

    const schema = S.required(
      S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean), S.element(S.boolean))
    )

    await Util.expectParseSuccess(schema, ["", 0, true])
    await Util.expectParseSuccess(schema, ["", 0, true, false])
    await Util.expectParseSuccess(schema, ["", 0, 1, 2, 3, true, false])

    await Util.expectParseFailure(schema, [], "/0 is missing")
    await Util.expectParseFailure(schema, [""], "/1 is missing")
    await Util.expectParseFailure(schema, ["", true], "/2 is missing")
    await Util.expectParseFailure(
      schema,
      ["", 0, "a"],
      `/2 union member: Expected number, actual "a", union member: Expected boolean, actual "a"`
    )
  })

  it("union", async () => {
    const schema = S.required(S.union(
      S.struct({ a: S.optional(S.string) }),
      S.struct({ b: S.optional(S.number) })
    ))
    await Util.expectParseSuccess(schema, { a: "a" })
    await Util.expectParseSuccess(schema, { b: 1 })
    await Util.expectParseFailure(
      schema,
      {},
      "union member: /a is missing, union member: /b is missing"
    )
  })

  it("lazy", async () => {
    interface A {
      readonly a: null | A
    }
    const schema: S.Schema<A> = S.required(S.lazy(() =>
      S.struct({
        a: S.optional(S.union(S.null, schema))
      })
    ))
    await Util.expectParseSuccess(schema, { a: null })
    await Util.expectParseSuccess(schema, { a: { a: null } })
    await Util.expectParseFailure(schema, {}, "/a is missing")
    await Util.expectParseFailure(
      schema,
      { a: {} },
      "/a union member: /a is missing, union member: Expected null, actual {}"
    )
  })

  it("declarations should throw", async () => {
    expect(() => S.required(S.optionFromSelf(S.string))).toThrowError(
      new Error("`required` cannot handle declarations")
    )
  })

  it("refinements should throw", async () => {
    expect(() => S.required(S.string.pipe(S.minLength(2)))).toThrowError(
      new Error("`required` cannot handle refinements")
    )
  })

  it("transformations should throw", async () => {
    expect(() => S.required(S.transform(S.string, S.string, identity, identity))).toThrowError(
      new Error("`required` cannot handle transformations")
    )
  })
})
