import * as O from "@effect/data/Option"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("optional", () => {
  it("default", async () => {
    const schema = S.struct({
      a: S.optional(S.NumberFromString).withDefault(() => 0)
    })
    await Util.expectParseSuccess(schema, {}, { a: 0 })
    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected string -> number, actual "a"`)

    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
  })

  it("Option", async () => {
    const schema = S.struct({ a: S.optional(S.NumberFromString).toOption() })
    await Util.expectParseSuccess(schema, {}, { a: O.none() })
    await Util.expectParseSuccess(schema, { a: "1" }, { a: O.some(1) })
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected string -> number, actual "a"`)

    await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
  })

  it("never", async () => {
    const schema = S.struct({ a: S.optional(S.never), b: S.number })
    await Util.expectParseSuccess(schema, { b: 1 })
    await Util.expectParseFailure(schema, { a: "a", b: 1 }, `/a Expected never, actual "a"`)
  })

  it("all", async () => {
    const schema = S.struct({
      a: S.boolean,
      b: S.optional(S.NumberFromString),
      c: S.optional(S.Trim).withDefault(() => "-"),
      d: S.optional(S.Date).toOption()
    })
    await Util.expectParseSuccess(schema, { a: true }, { a: true, c: "-", d: O.none() })
    await Util.expectParseSuccess(schema, { a: true, b: "1" }, {
      a: true,
      b: 1,
      c: "-",
      d: O.none()
    })
    await Util.expectParseSuccess(schema, { a: true, c: "a" }, { a: true, c: "a", d: O.none() })
    await Util.expectParseSuccess(schema, { a: true, d: "1970-01-01T00:00:00.000Z" }, {
      a: true,
      c: "-",
      d: O.some(new Date(0))
    })
    await Util.expectParseSuccess(schema, { a: true, c: "a", d: "1970-01-01T00:00:00.000Z" }, {
      a: true,
      c: "a",
      d: O.some(new Date(0))
    })
    await Util.expectParseSuccess(schema, {
      a: true,
      c: "a",
      d: "1970-01-01T00:00:00.000Z",
      b: "1"
    }, {
      a: true,
      b: 1,
      c: "a",
      d: O.some(new Date(0))
    })
  })
})
