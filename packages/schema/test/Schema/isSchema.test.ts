import * as S from "@effect/schema/Schema"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("isSchema", () => {
  it("Schema", () => {
    expect(S.isSchema(S.string)).toBe(true)
    expect(S.isSchema(S.parseJson)).toBe(false)
  })

  it("BrandSchema", () => {
    expect(S.isSchema(S.string.pipe(S.brand("my-brand")))).toBe(true)
  })

  it("PropertySignature", () => {
    expect(S.isSchema(S.propertySignatureDeclaration(S.string))).toBe(false)
    expect(S.isSchema(S.optional(S.string, { exact: true }))).toBe(false)
    const ps = S.propertySignatureTransformation(
      S.NumberFromString,
      "?:",
      S.number,
      ":",
      Option.orElse(() => Option.some(0)),
      identity
    )
    expect(S.isSchema(ps)).toBe(false)
  })
})
