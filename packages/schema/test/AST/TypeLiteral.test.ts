import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST.TypeLiteral", () => {
  it("should throw on onvalid index signature parameters", () => {
    expect(() => new AST.IndexSignature(S.NumberFromString.ast, AST.stringKeyword, true)).toThrow(
      new Error(
        `Unsupported index signature parameter
details: An index signature parameter type must be \`string\`, \`symbol\`, a template literal type or a refinement of the previous types`
      )
    )
  })
})
