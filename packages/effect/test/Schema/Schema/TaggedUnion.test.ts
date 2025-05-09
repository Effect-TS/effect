import { describe, it } from "@effect/vitest"
import * as Equal from "effect/Equal"
import * as S from "effect/Schema"
import { strictEqual } from "node:assert"
import * as Util from "../TestUtils.js"

describe("TaggedUnion", () => {
  const schema = S.TaggedUnion({
    A: {},
    B: { value: S.String },
    C: { otherValue: S.Number }
  })

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("implements Equal", () => {
    const value1 = S.decodeSync(schema)({ _tag: "A" })
    const value2 = S.decodeSync(schema)({ _tag: "A" })
    strictEqual(Equal.equals(value1, value2), true)
  })

  it("$match", () => {
    const valueA = schema.members.A.make()
    const valueB = schema.members.B.make({ value: "ok" })
    let result = schema.$match(valueA, {
      A: () => "A",
      B: () => "B",
      C: () => "C"
    })
    strictEqual(result, "A")
    result = schema.$match(valueB, {
      A: () => "A",
      B: () => "B",
      C: () => "C"
    })
    strictEqual(result, "B")
  })
})
