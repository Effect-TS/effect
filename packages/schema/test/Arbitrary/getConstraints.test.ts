import * as A from "@effect/schema/Arbitrary"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

const expectConstraints = <A, I>(schema: S.Schema<A, I>, constraints: A.Constraints) => {
  expect(A.getConstraints(schema.ast as any)).toEqual(constraints)
}

describe("Arbitrary > getConstraints", () => {
  describe("number", () => {
    it("GreaterThanTypeId", () => {
      expectConstraints(S.number.pipe(S.greaterThan(0)), new A.NumberConstraints({ min: 0 }))
    })

    it("GreaterThanOrEqualToTypeId", () => {
      expectConstraints(S.number.pipe(S.greaterThanOrEqualTo(0)), new A.NumberConstraints({ min: 0 }))
    })

    it("LessThanTypeId", () => {
      expectConstraints(S.number.pipe(S.lessThan(0)), new A.NumberConstraints({ max: 0 }))
    })

    it("LessThanOrEqualToTypeId", () => {
      expectConstraints(S.number.pipe(S.lessThanOrEqualTo(0)), new A.NumberConstraints({ max: 0 }))
    })

    it("PositiveTypeId", () => {
      expectConstraints(S.number.pipe(S.positive()), new A.NumberConstraints({ min: 0 }))
    })

    it("NonNegativeTypeId", () => {
      expectConstraints(S.number.pipe(S.nonNegative()), new A.NumberConstraints({ min: 0 }))
    })

    it("NegativeTypeId", () => {
      expectConstraints(S.number.pipe(S.negative()), new A.NumberConstraints({ max: 0 }))
    })

    it("NonPositiveTypeId", () => {
      expectConstraints(S.number.pipe(S.nonPositive()), new A.NumberConstraints({ max: 0 }))
    })

    it("BetweenTypeId", () => {
      expectConstraints(S.number.pipe(S.between(0, 10)), new A.NumberConstraints({ min: 0, max: 10 }))
    })
  })

  describe("bigint", () => {
    it("GreaterThanBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.greaterThanBigint(BigInt(0))),
        new A.BigIntConstraints({ min: BigInt(0) })
      )
    })

    it("GreaterThanOrEqualToBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.greaterThanOrEqualToBigint(BigInt(0))),
        new A.BigIntConstraints({ min: BigInt(0) })
      )
    })

    it("LessThanBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.lessThanBigint(BigInt(0))),
        new A.BigIntConstraints({ max: BigInt(0) })
      )
    })

    it("LessThanOrEqualToBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.lessThanOrEqualToBigint(BigInt(0))),
        new A.BigIntConstraints({ max: BigInt(0) })
      )
    })

    it("PositiveBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.positiveBigint()),
        new A.BigIntConstraints({ min: BigInt(0) })
      )
    })

    it("NonNegativeBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.nonNegativeBigint()),
        new A.BigIntConstraints({ min: BigInt(0) })
      )
    })

    it("NegativeBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.negativeBigint()),
        new A.BigIntConstraints({ max: BigInt(0) })
      )
    })

    it("NonPositiveBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.nonPositiveBigint()),
        new A.BigIntConstraints({ max: BigInt(0) })
      )
    })

    it("BetweenBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.betweenBigint(BigInt(0), BigInt(10))),
        new A.BigIntConstraints({ min: BigInt(0), max: BigInt(10) })
      )
    })
  })

  it("IntTypeId", () => {
    expectConstraints(S.number.pipe(S.int()), new A.IntegerConstraints({}))
  })

  it("MinLengthTypeId", () => {
    expectConstraints(S.string.pipe(S.minLength(5)), new A.StringConstraints({ minLength: 5 }))
  })

  it("MaxLengthTypeId", () => {
    expectConstraints(S.string.pipe(S.maxLength(5)), new A.StringConstraints({ maxLength: 5 }))
  })

  it("ItemsCountTypeId", () => {
    expectConstraints(
      S.array(S.string).pipe(S.itemsCount(5)),
      new A.ArrayConstraints({ minLength: 5, maxLength: 5 })
    )
  })

  it("MinItemsTypeId", () => {
    expectConstraints(S.array(S.string).pipe(S.minItems(4)), new A.ArrayConstraints({ minLength: 4 }))
  })

  it("MaxItemsTypeId", () => {
    expectConstraints(S.array(S.string).pipe(S.maxItems(6)), new A.ArrayConstraints({ maxLength: 6 }))
  })
})

describe("Arbitrary/combineConstraints", () => {
  it("Number <> Number", () => {
    const c1 = new A.NumberConstraints({ min: 0, max: 10, noNaN: true })
    const c2 = new A.NumberConstraints({ min: 1, max: 9, noDefaultInfinity: true })
    const c3 = new A.NumberConstraints({ min: 1, max: 9, noNaN: true, noDefaultInfinity: true })
    expect(A.combineConstraints(c1, c2)).toEqual(c3)
    expect(A.combineConstraints(c2, c1)).toEqual(c3)
  })

  it("Number <> Integer", () => {
    const c1 = new A.NumberConstraints({ min: 0, max: 10, noNaN: true })
    const c2 = new A.IntegerConstraints({ min: 1, max: 9 })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })

  it("BigInt <> BigInt", () => {
    const c1 = new A.BigIntConstraints({ min: BigInt(0), max: BigInt(10) })
    const c2 = new A.BigIntConstraints({ min: BigInt(1), max: BigInt(9) })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })

  it("String <> String", () => {
    const c1 = new A.StringConstraints({ minLength: 0, maxLength: 10 })
    const c2 = new A.StringConstraints({ minLength: 1, maxLength: 9 })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })

  it("Number <> undefined", () => {
    expect(
      A.combineConstraints(new A.NumberConstraints({}), undefined)
    ).toEqual(new A.NumberConstraints({}))
  })

  it("Number <> String", () => {
    expect(
      A.combineConstraints(new A.NumberConstraints({}), new A.StringConstraints({}))
    ).toEqual(undefined)
  })

  it("String <> Number", () => {
    expect(
      A.combineConstraints(new A.StringConstraints({}), new A.NumberConstraints({}))
    ).toEqual(undefined)
  })

  it("Integer <> String", () => {
    expect(
      A.combineConstraints(new A.IntegerConstraints({}), new A.StringConstraints({}))
    ).toEqual(undefined)
  })

  it("Array <> Array", () => {
    const c1 = new A.ArrayConstraints({ minLength: 0, maxLength: 10 })
    const c2 = new A.ArrayConstraints({ minLength: 1, maxLength: 9 })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })
})
