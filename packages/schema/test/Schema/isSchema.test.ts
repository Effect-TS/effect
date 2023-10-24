import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("isSchema", () => {
  it("Schema", () => {
    expect(S.isSchema(S.string)).toBe(true)
    expect(S.isSchema(S.propertySignature(S.string, {}))).toBe(false)
    expect(S.isSchema(S.optional(S.string))).toBe(false)
  })

  it("BrandSchema", () => {
    expect(S.isSchema(S.string.pipe(S.brand("my-brand")))).toBe(true)
  })

  it("Codec", () => {
    expect(S.isSchema(S.numberFromString)).toBe(false)
  })
})
