import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { formatIssue } from "@effect/schema/TreeFormatter"
import * as Either from "effect/Either"
import { describe, expect, it } from "vitest"

const expectMessage = <I, A>(
  schema: S.Schema<never, I, A>,
  u: unknown,
  message: string
) => {
  expect(Either.mapLeft(S.parseEither(schema)(u), (e) => formatIssue(e.error))).toEqual(
    Either.left(message)
  )
}

export const expectForbidden = <I, A>(
  schema: S.Schema<never, I, A>,
  u: unknown,
  message: string
) => {
  expectMessage(Util.effectify(schema), u, message)
}

describe("Schema > Forbidden", () => {
  it("tuple", () => {
    expectForbidden(
      S.tuple(S.string),
      ["a"],
      `readonly [(string <-> string)]
└─ [0]
   └─ is forbidden`
    )
  })

  it("array", () => {
    expectForbidden(
      S.array(S.string),
      ["a"],
      `ReadonlyArray<(string <-> string)>
└─ [0]
   └─ is forbidden`
    )
  })

  it("struct", () => {
    expectForbidden(
      S.struct({ a: S.string }),
      { a: "a" },
      `{ a: (string <-> string) }
└─ ["a"]
   └─ is forbidden`
    )
  })

  it("record", () => {
    expectForbidden(
      S.record(S.string, S.string),
      { a: "a" },
      `{ [x: string]: (string <-> string) }
└─ ["a"]
   └─ is forbidden`
    )
  })

  it("union", () => {
    expectForbidden(
      S.union(S.string, S.string.pipe(S.minLength(2))),
      "a",
      `a string at least 2 character(s) long | (string <-> string)
├─ Union member
│  └─ a string at least 2 character(s) long
│     └─ From side refinement failure
│        └─ is forbidden
└─ Union member
   └─ is forbidden`
    )
  })

  it("declaration", () => {
    const parse = ParseResult.parse(Util.effectify(S.number))
    const unparse = ParseResult.unparse(Util.effectify(S.number))
    const transform = S.declare([], () => parse, () => unparse)
    expectMessage(
      transform,
      1,
      "is forbidden"
    )
  })

  it("transform", () => {
    const transform = S.transformOrFail(
      S.string,
      S.transformOrFail(
        S.string,
        S.string,
        (s) => ParseResult.flatMap(Util.sleep, () => ParseResult.succeed(s)),
        (s) => ParseResult.flatMap(Util.sleep, () => ParseResult.succeed(s))
      ),
      ParseResult.succeed,
      ParseResult.succeed
    )
    expectMessage(
      transform,
      "a",
      `(string <-> (string <-> string))
└─ To side transformation failure
   └─ is forbidden`
    )
  })
})
