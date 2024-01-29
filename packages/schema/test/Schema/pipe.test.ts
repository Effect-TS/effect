import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema/pipe", () => {
  it("schemas should be pipeable", () => {
    const int = <I, A extends number>(self: S.Schema<never, I, A>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <I, A extends number>(self: S.Schema<never, I, A>) => self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.NumberFromString.pipe(int, positive)

    expect(PositiveInt.is(1)).toEqual(true)
    expect(PositiveInt.is(-1)).toEqual(false)
    expect(PositiveInt.is(1.2)).toEqual(false)
  })
})
