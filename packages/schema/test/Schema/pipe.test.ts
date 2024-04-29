import * as S from "@effect/schema/Schema"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("pipe", () => {
  it("schemas should be pipeable", () => {
    const int = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.NumberFromString.pipe(int, positive)

    const is = S.is(PositiveInt)
    expect(is(1)).toEqual(true)
    expect(is(-1)).toEqual(false)
    expect(is(1.2)).toEqual(false)
  })
})
