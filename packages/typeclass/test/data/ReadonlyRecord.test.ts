import * as OptionInstances from "@effect/typeclass/data/Option"
import * as ReadonlyRecordInstances from "@effect/typeclass/data/ReadonlyRecord"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe.concurrent("ReadonlyRecord", () => {
  it("traverse (string)", () => {
    const traverse = ReadonlyRecordInstances.traverse(OptionInstances.Applicative)
    const stringRecord: Record<string, number> = {
      a: 1,
      b: 2
    }
    expect(traverse(stringRecord, (a, k) => Option.some(a + k))).toStrictEqual(Option.some({
      a: "1a",
      b: "2b"
    }))
  })

  it("traverse (symbol)", () => {
    const traverse = ReadonlyRecordInstances.traverse(OptionInstances.Applicative)
    const a = Symbol.for("a")
    const b = Symbol.for("b")
    const symbolRecord: Record<symbol, number> = {
      [a]: 1,
      [b]: 2
    }
    expect(traverse(symbolRecord, (a) => Option.some(a))).toStrictEqual(Option.some({}))
  })
})
