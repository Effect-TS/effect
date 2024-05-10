import * as S from "@effect/schema/Schema"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("withConstructorDefault", () => {
  it("annotating a PropertySignatureDeclaration should repect existing defaultValues", () => {
    const prop: any = S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")).annotations({})
    expect(prop.ast.defaultValue()).toBe("")
  })

  it("annotating a PropertySignatureTransformation should repect existing defaultValues", () => {
    const prop: any = S.optional(S.String, { nullable: true }).pipe(S.withConstructorDefault(() => "")).annotations(
      {}
    )
    expect(prop.ast.to.defaultValue()).toBe("")
  })

  it("using fromKey should repect existing defaultValues", () => {
    const prop: any = S.propertySignature(S.String).pipe(S.withConstructorDefault(() => ""), S.fromKey("a"))
    expect(prop.ast.to.defaultValue()).toBe("")
  })
})
