import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("pipe", () => {
  it("schemas should be pipeable", () => {
    const int = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.NumberFromString.pipe(int, positive)

    const is = S.is(PositiveInt)
    assertTrue(is(1))
    assertFalse(is(-1))
    assertFalse(is(1.2))
  })
})
