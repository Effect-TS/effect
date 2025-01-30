import * as S from "effect/Schema"
import { assertFalse, assertTrue } from "effect/test/util"
import { describe, it } from "vitest"

describe("isSchema", () => {
  it("Schema", () => {
    assertTrue(S.isSchema(S.String))
    assertFalse(S.isSchema(S.parseJson))
  })

  it("BrandSchema", () => {
    assertTrue(S.isSchema(S.String.pipe(S.brand("my-brand"))))
  })

  it("PropertySignature", () => {
    assertFalse(S.isSchema(S.propertySignature(S.String)))
    assertFalse(S.isSchema(S.optionalWith(S.String, { exact: true })))
    assertFalse(S.isSchema(S.optionalWith(S.String, { default: () => "" })))
  })
})
