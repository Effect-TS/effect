import * as E from "@effect/data/Either"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const expectForbidden = <I, A>(
  schema: S.Schema<I, A>,
  u: unknown,
  message: string
) => {
  const eschema = Util.effectifySchema(schema, "all")
  expect(E.mapLeft(S.parseEither(eschema)(u), (e) => Util.formatAll(e.errors))).toEqual(
    E.left(message)
  )
}

describe.concurrent("Forbidden", () => {
  it("tuple", () => {
    expectForbidden(S.tuple(S.string), ["a"], "/0 is forbidden")
  })

  it("array", () => {
    expectForbidden(S.array(S.string), ["a"], "/0 is forbidden")
  })

  it("struct", () => {
    expectForbidden(S.struct({ a: S.string }), { a: "a" }, "/a is forbidden")
  })

  it("record", () => {
    expectForbidden(S.record(S.string, S.string), { a: "a" }, "/a is forbidden")
  })

  it("union", () => {
    expectForbidden(
      S.union(S.string, S.string),
      { a: "a" },
      "union member: is forbidden, union member: is forbidden"
    )
  })

  it("declaration", () => {
    const schema = S.declare([], S.number, () => S.parseEffect(S.number))
    expectForbidden(
      schema,
      1,
      "is forbidden"
    )
  })
})
