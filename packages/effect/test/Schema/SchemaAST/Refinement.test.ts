import * as S from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("AST.Refinement", () => {
  it("toString", () => {
    expect(String(S.Number.pipe(S.filter(() => true)))).toBe("{ number | filter }")
    expect(String(S.Number.pipe(S.int()))).toBe("int")
    expect(String(S.Number.pipe(S.int(), S.positive()))).toBe("int & positive")
    expect(String(S.Int.pipe(S.positive()))).toBe("Int & positive")
  })
})
