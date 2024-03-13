import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > toString", () => {
  it("Schema", () => {
    expect(String(S.string)).toStrictEqual("string")
    expect(String(S.union(S.string, S.number))).toStrictEqual("string | number")
    expect(String(S.tuple(S.string, S.optionalElement(S.number)))).toStrictEqual("readonly [string, number?]")
  })

  it("BrandedSchema", () => {
    expect(String(S.string.pipe(S.brand("my-brand")))).toStrictEqual(`string & Brand<"my-brand">`)
  })

  it("OptionalElement", () => {
    expect(String(S.optionalElement(S.string))).toStrictEqual("string?")
  })

  it("PropertySignature", () => {
    expect(String(S.optional(S.string))).toStrictEqual(
      `PropertySignature<"?:", string | undefined, never, "?:", string | undefined>`
    )
    expect(String(S.optional(S.string).pipe(S.fromKey("a")))).toStrictEqual(
      `PropertySignature<"?:", string | undefined, "a", "?:", string | undefined>`
    )
  })
})
