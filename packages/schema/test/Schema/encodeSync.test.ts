import * as P from "@effect/schema/Parser"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > encodeSync", () => {
  it("should raise an error for invalid values", () => {
    const schema = Util.NumberFromChar
    expect(P.encodeSync(schema)(1)).toEqual("1")
    expect(() => P.encodeSync(schema)(10)).toThrow(
      new Error(`NumberFromChar
└─ From side transformation failure
   └─ Char
      └─ Predicate refinement failure
         └─ Expected Char (a single character), actual "10"`)
    )
  })
})
