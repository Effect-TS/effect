import * as _ from "@effect/schema/ArrayFormatter"
import type { ParseOptions } from "@effect/schema/AST"
import { ParseResult } from "@effect/schema/index"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Either from "effect/Either"
import { describe, expect, it } from "vitest"

const options: ParseOptions = { errors: "all", onExcessProperty: "error" }

const expectIssues = <I, A>(schema: S.Schema<I, A>, input: unknown, issues: Array<_.Issue>) => {
  const result = S.parseEither(schema)(input, options).pipe(
    Either.mapLeft((e) => _.formatErrors(e.errors))
  )
  expect(result).toStrictEqual(Either.left(issues))
}

describe("ArrayFormatter", () => {
  it("Type", () => {
    const schema = S.string
    expectIssues(schema, null, [{
      _tag: "Type",
      path: [],
      message: "Expected string, actual null"
    }])
  })

  it("Type with message annotation", () => {
    const schema = S.string.pipe(S.message(() => "my message annotation"))
    expectIssues(schema, null, [{
      _tag: "Type",
      path: [],
      message: "my message annotation"
    }])
  })

  it("Type with custom message", () => {
    const schema = S.string.pipe(
      S.transformOrFail(
        S.string,
        (s, _, ast) => ParseResult.fail(ParseResult.type(ast, s, "my custom message")),
        ParseResult.succeed
      )
    )
    expectIssues(schema, "", [{
      _tag: "Type",
      path: [],
      message: "my custom message"
    }])
  })

  it("Key", () => {
    const schema = S.struct({ a: S.string })
    expectIssues(schema, { a: null }, [{
      _tag: "Type",
      path: ["a"],
      message: "Expected string, actual null"
    }])
  })

  it("Index", () => {
    const schema = S.tuple(S.string)
    expectIssues(schema, [null], [{
      _tag: "Type",
      path: [0],
      message: "Expected string, actual null"
    }])
  })

  it("Unexpected (struct)", () => {
    const schema = S.struct({ a: S.string })
    expectIssues(schema, { a: "a", b: 1 }, [{
      _tag: "Unexpected",
      path: ["b"],
      message: `Unexpected, expected "a"`
    }])
  })

  it("Unexpected (tuple)", () => {
    const schema = S.tuple(S.string)
    expectIssues(schema, ["a", 1], [{
      _tag: "Unexpected",
      path: [1],
      message: "Unexpected"
    }])
  })

  it("Missing (struct)", () => {
    const schema = S.struct({ a: S.string })
    expectIssues(schema, {}, [{
      _tag: "Missing",
      path: ["a"],
      message: "Missing key or index"
    }])
  })

  it("Missing (tuple)", () => {
    const schema = S.tuple(S.string)
    expectIssues(schema, [], [{
      _tag: "Missing",
      path: [0],
      message: "Missing key or index"
    }])
  })

  it("UnionMember", () => {
    const schema = S.union(S.string, S.number)
    expectIssues(schema, null, [{
      _tag: "Type",
      path: [],
      message: "Expected string, actual null"
    }, {
      _tag: "Type",
      path: [],
      message: "Expected number, actual null"
    }])
  })

  it("Forbidden", () => {
    const schema = Util.effectify(S.string, "all")
    expectIssues(schema, "", [{
      _tag: "Forbidden",
      path: [],
      message: "Forbidden"
    }])
  })

  it("real world example", () => {
    const Name = S.string.pipe(
      S.trim,
      S.minLength(2, { message: () => "We expect a name of at least 2 characters" }),
      S.maxLength(100, { message: () => "We expect a name with a maximum of 100 characters" })
    )
    const schema = S.struct({
      name: Name,
      age: S.number,
      tags: S.array(S.string)
    })
    expectIssues(schema, { name: "", tags: ["b", null], a: 1 }, [
      {
        _tag: "Unexpected",
        path: ["a"],
        message: `Unexpected, expected "age" or "name" or "tags"`
      },
      {
        _tag: "Missing",
        path: ["age"],
        message: "Missing key or index"
      },
      {
        _tag: "Type",
        path: ["name"],
        message: "We expect a name of at least 2 characters"
      },
      {
        _tag: "Type",
        path: ["tags", 1],
        message: "Expected string, actual null"
      }
    ])
  })
})
