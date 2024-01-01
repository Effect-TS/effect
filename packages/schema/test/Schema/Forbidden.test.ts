import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as E from "effect/Either"
import { describe, expect, it } from "vitest"

const expectMessage = <I, A>(
  schema: S.Schema<I, A>,
  u: unknown,
  message: string
) => {
  expect(E.mapLeft(S.parseEither(schema)(u), (e) => formatErrors(e.errors))).toEqual(
    E.left(message)
  )
}

export const expectForbidden = <I, A>(
  schema: S.Schema<I, A>,
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
    const transform = S.declare(
      [],
      S.number,
      () => S.parse(Util.effectify(S.number))
    )
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
        (s) => PR.flatMap(Util.sleep, () => PR.succeed(s)),
        (s) => PR.flatMap(Util.sleep, () => PR.succeed(s))
      ),
      E.right,
      E.right
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
