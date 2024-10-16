import * as S from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("toString", () => {
  it("Schema", () => {
    expect(String(S.String)).toStrictEqual("string")
    expect(String(S.Union(S.String, S.Number))).toStrictEqual("string | number")
    expect(String(S.Tuple(S.String, S.optionalElement(S.Number)))).toStrictEqual("readonly [string, number?]")
  })

  it("BrandedSchema", () => {
    expect(String(S.String.pipe(S.brand("my-brand")))).toStrictEqual(`string & Brand<"my-brand">`)
  })

  it("optionalElement", () => {
    expect(String(S.optionalElement(S.String))).toStrictEqual("string?")
  })

  it("PropertySignature", () => {
    expect(String(S.optional(S.String))).toStrictEqual(
      `PropertySignature<"?:", string | undefined, never, "?:", string | undefined>`
    )
    expect(String(S.optional(S.String).pipe(S.fromKey("a")))).toStrictEqual(
      `PropertySignature<"?:", string | undefined, "a", "?:", string | undefined>`
    )
  })
})
