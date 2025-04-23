import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("AST.Refinement", () => {
  it("toString", () => {
    strictEqual(String(S.Number.pipe(S.filter(() => true))), "{ number | filter }")
    strictEqual(String(S.Number.pipe(S.int())), "int")
    strictEqual(String(S.Number.pipe(S.int(), S.positive())), "int & positive")
    strictEqual(String(S.Int.pipe(S.positive())), "Int & positive")
  })
})
