import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import { isNumber } from "@effect/data/Number"
import { isRecord } from "@effect/data/Predicate"
import { isString } from "@effect/data/String"
import type { Json, JsonArray, JsonObject } from "@fp-ts/schema/data/Json"
import { json } from "@fp-ts/schema/data/Json"
import * as _ from "@fp-ts/schema/formatter/Tree"
import * as I from "@fp-ts/schema/internal/common"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Tree", () => {
  it("formatErrors/ Unexpected", () => {
    const schema = S.struct({ a: S.string })
    Util.expectDecodingFailureTree(
      schema,
      { a: "a", b: 1 },
      `1 error(s) found
└─ key "b"
   └─ is unexpected`
    )
  })

  it("formatErrors/ union", () => {
    const parser = I.fromRefinement(
      S.union(S.string, S.number),
      (u): u is string | number => isString(u) || isNumber(u)
    )
    expect(pipe(parser.parse(null), E.mapLeft(_.formatErrors))).toEqual(E.left(`1 error(s) found
└─ Expected string or number, actual null`))
  })

  it("formatErrors/ lazy", () => {
    const isJsonArray = (u: unknown): u is JsonArray => Array.isArray(u) && u.every(isJson)

    const isJsonObject = (u: unknown): u is JsonObject =>
      isRecord(u) && Object.keys(u).every((key) => isJson(u[key]))

    const isJson = (u: unknown): u is Json =>
      u === null || typeof u === "string" || (typeof u === "number" && !isNaN(u) && isFinite(u)) ||
      typeof u === "boolean" ||
      isJsonArray(u) ||
      isJsonObject(u)

    const parser = I.fromRefinement(json, isJson)
    expect(pipe(parser.parse(undefined), E.mapLeft(_.formatErrors))).toEqual(
      E.left(`1 error(s) found
└─ Expected <anonymous Lazy schema>, actual undefined`)
    )
  })

  it("formatActual/ catch", () => {
    const circular: any = { a: null }
    circular.a = circular
    expect(_.formatActual(circular)).toEqual("[object Object]")
  })
})
