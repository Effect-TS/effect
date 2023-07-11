import * as E from "@effect/data/Either"
import * as AST from "@effect/schema/AST"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const expectMessage = <I, A>(
  schema: S.Schema<I, A>,
  u: unknown,
  message: string
) => {
  expect(E.mapLeft(S.parseEither(schema)(u), (e) => Util.formatAll(e.errors))).toEqual(
    E.left(message)
  )
}

export const expectForbidden = <I, A>(
  schema: S.Schema<I, A>,
  u: unknown,
  message: string
) => {
  expectMessage(Util.effectify(schema, "all"), u, message)
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
      S.union(S.string, S.string.pipe(S.minLength(2))),
      "a",
      `union member: is forbidden, union member: is forbidden`
    )
  })

  it("declaration", () => {
    const schema = S.declare(
      [],
      S.number,
      () => S.parse(Util.effectify(S.number, "all"))
    )
    expectMessage(
      schema,
      1,
      "is forbidden"
    )
  })

  it("transform", () => {
    const schema = S.transformResult(
      S.string,
      S.transformResult(
        S.string,
        S.string,
        (s) => PR.flatMap(Util.sleep, () => PR.success(s)),
        (s) => PR.flatMap(Util.sleep, () => PR.success(s))
      ),
      E.right,
      E.right
    )
    expectMessage(
      schema,
      "a",
      "is forbidden"
    )
  })

  it("refinement", () => {
    const ast = AST.createRefinement(
      S.string.ast,
      (input) => PR.flatMap(Util.sleep, () => PR.success(input)),
      false
    )
    const schema: S.Schema<string, string> = S.make(ast)
    expectMessage(
      schema,
      "a",
      "is forbidden"
    )
  })
})
