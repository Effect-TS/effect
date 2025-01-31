import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"

describe("withConstructorDefault", () => {
  it("annotating a PropertySignatureDeclaration should repect existing defaultValues", () => {
    const prop: any = S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")).annotations({})
    strictEqual(prop.ast.defaultValue(), "")
  })

  it("annotating a PropertySignatureTransformation should repect existing defaultValues", () => {
    const prop: any = S.optionalWith(S.String, { nullable: true }).pipe(S.withConstructorDefault(() => "")).annotations(
      {}
    )
    strictEqual(prop.ast.to.defaultValue(), "")
  })

  it("using fromKey should repect existing defaultValues", () => {
    const prop: any = S.propertySignature(S.String).pipe(S.withConstructorDefault(() => ""), S.fromKey("a"))
    strictEqual(prop.ast.to.defaultValue(), "")
  })
})
