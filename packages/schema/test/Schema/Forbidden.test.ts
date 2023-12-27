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
  expectMessage(Util.effectify(schema, "all"), u, message)
}

describe("Schema > Forbidden", () => {
  it("tuple", () => {
    expectForbidden(
      S.tuple(S.string),
      ["a"],
      `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is forbidden`
    )
  })

  it("array", () => {
    expectForbidden(
      S.array(S.string),
      ["a"],
      `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is forbidden`
    )
  })

  it("struct", () => {
    expectForbidden(
      S.struct({ a: S.string }),
      { a: "a" },
      `["a"]
└─ is forbidden`
    )
  })

  it("record", () => {
    expectForbidden(
      S.record(S.string, S.string),
      { a: "a" },
      `["a"]
└─ is forbidden`
    )
  })

  it("union", () => {
    expectForbidden(
      S.union(S.string, S.string.pipe(S.minLength(2))),
      "a",
      `Union (2 members): string
├─ Union member: string
│  └─ is forbidden
└─ Union member: string
   └─ is forbidden`
    )
  })

  it("declaration", () => {
    const transform = S.declare(
      [],
      S.number,
      () => S.parse(Util.effectify(S.number, "all"))
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
      "is forbidden"
    )
  })
})
