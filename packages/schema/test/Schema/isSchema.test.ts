import * as S from "@effect/schema/Schema"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("isSchema", () => {
  it("Schema", () => {
    expect(S.isSchema(S.String)).toBe(true)
    expect(S.isSchema(S.parseJson)).toBe(false)
  })

  it("BrandSchema", () => {
    expect(S.isSchema(S.String.pipe(S.brand("my-brand")))).toBe(true)
  })

  it("PropertySignature", () => {
    expect(S.isSchema(S.propertySignature(S.String))).toBe(false)
    expect(S.isSchema(S.optional(S.String, { exact: true }))).toBe(false)
    expect(S.isSchema(S.optional(S.String, { default: () => "" }))).toBe(false)
  })
})
