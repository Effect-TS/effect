import { format } from "@effect/schema/Schema"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > format", () => {
  it("refinement", () => {
    const schema = S.string.pipe(S.minLength(2))
    expect(format(schema)).toEqual("a string at least 2 character(s) long")
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    expect(format(schema)).toEqual("string | number")
  })

  it("suspend", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () => S.tuple(S.number, S.union(schema, S.literal(null)))
    )
    expect(format(schema)).toEqual("<suspended schema>")
  })

  it("suspend before initialization", () => {
    const schema = S.suspend(() => string)
    expect(format(schema)).toEqual("<suspended schema>")
    const string = S.string
  })
})
