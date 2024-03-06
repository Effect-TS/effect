import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > $typeLiteral", () => {
  it("decoding", async () => {
    const schema = new S.$typeLiteral({
      a: S.optional(S.string, { default: () => "" })
    }, [{ key: S.literal("b", "c"), value: S.NumberFromString }, { key: S.string, value: S.NumberFromString }])
    expect(String(schema)).toStrictEqual(
      "({ a?: string | undefined; b: NumberFromString; c: NumberFromString; [x: string]: NumberFromString } <-> { a: string; b: number; c: number; [x: string]: number })"
    )
  })
})
