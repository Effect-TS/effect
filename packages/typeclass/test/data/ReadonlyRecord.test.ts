import * as OptionInstances from "@effect/typeclass/data/Option"
import * as ReadonlyRecordInstances from "@effect/typeclass/data/ReadonlyRecord"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe.concurrent("ReadonlyRecord", () => {
  it("Traversable.traverse", () => {
    const traverse = ReadonlyRecordInstances.Traversable.traverse(OptionInstances.Applicative)
    const struct: Record<"a" | "b", number> = {
      a: 1,
      b: 2
    }
    expect(traverse(struct, (a) => Option.some(a))).toStrictEqual(Option.some({
      a: 1,
      b: 2
    }))
    expect(traverse(struct, (a) => a < 1 ? Option.some(a) : Option.none())).toStrictEqual(Option.none())

    const a = Symbol.for("a")
    const b = Symbol.for("b")
    const symbolRecord: Record<symbol, number> = {
      [a]: 1,
      [b]: 2
    }
    expect(traverse(symbolRecord, (a) => Option.some(a))).toStrictEqual(Option.some({
      a: 1,
      b: 2
    }))
  })

  it("traverse", () => {
    const traverse = ReadonlyRecordInstances.traverse(OptionInstances.Applicative)
    const struct: Record<"a" | "b", number> = {
      a: 1,
      b: 2
    }
    expect(traverse(struct, (a, k) => Option.some(a + k))).toStrictEqual(Option.some({
      a: "1a",
      b: "2b"
    }))
  })
})
