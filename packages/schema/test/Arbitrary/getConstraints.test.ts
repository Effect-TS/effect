import * as A from "@effect/schema/Arbitrary"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

const expectConstraints = <I, A>(schema: S.Schema<I, A>, constraints: A.Constraints) => {
  expect(A.getConstraints(schema.ast as any)).toEqual(constraints)
}

describe("Arbitrary/getConstraints", () => {
  describe("number", () => {
    it("GreaterThanTypeId", () => {
      expectConstraints(S.number.pipe(S.greaterThan(0)), A.numberConstraints({ min: 0 }))
    })

    it("GreaterThanOrEqualToTypeId", () => {
      expectConstraints(S.number.pipe(S.greaterThanOrEqualTo(0)), A.numberConstraints({ min: 0 }))
    })

    it("LessThanTypeId", () => {
      expectConstraints(S.number.pipe(S.lessThan(0)), A.numberConstraints({ max: 0 }))
    })

    it("LessThanOrEqualToTypeId", () => {
      expectConstraints(S.number.pipe(S.lessThanOrEqualTo(0)), A.numberConstraints({ max: 0 }))
    })

    it("PositiveTypeId", () => {
      expectConstraints(S.number.pipe(S.positive()), A.numberConstraints({ min: 0 }))
    })

    it("NonNegativeTypeId", () => {
      expectConstraints(S.number.pipe(S.nonNegative()), A.numberConstraints({ min: 0 }))
    })

    it("NegativeTypeId", () => {
      expectConstraints(S.number.pipe(S.negative()), A.numberConstraints({ max: 0 }))
    })

    it("NonPositiveTypeId", () => {
      expectConstraints(S.number.pipe(S.nonPositive()), A.numberConstraints({ max: 0 }))
    })

    it("BetweenTypeId", () => {
      expectConstraints(S.number.pipe(S.between(0, 10)), A.numberConstraints({ min: 0, max: 10 }))
    })
  })

  describe("bigint", () => {
    it("GreaterThanBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.greaterThanBigint(BigInt(0))),
        A.bigintConstraints({ min: BigInt(0) })
      )
    })

    it("GreaterThanOrEqualToBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.greaterThanOrEqualToBigint(BigInt(0))),
        A.bigintConstraints({ min: BigInt(0) })
      )
    })

    it("LessThanBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.lessThanBigint(BigInt(0))),
        A.bigintConstraints({ max: BigInt(0) })
      )
    })

    it("LessThanOrEqualToBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.lessThanOrEqualToBigint(BigInt(0))),
        A.bigintConstraints({ max: BigInt(0) })
      )
    })

    it("PositiveBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.positiveBigint()),
        A.bigintConstraints({ min: BigInt(0) })
      )
    })

    it("NonNegativeBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.nonNegativeBigint()),
        A.bigintConstraints({ min: BigInt(0) })
      )
    })

    it("NegativeBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.negativeBigint()),
        A.bigintConstraints({ max: BigInt(0) })
      )
    })

    it("NonPositiveBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.nonPositiveBigint()),
        A.bigintConstraints({ max: BigInt(0) })
      )
    })

    it("BetweenBigintTypeId", () => {
      expectConstraints(
        S.bigintFromSelf.pipe(S.betweenBigint(BigInt(0), BigInt(10))),
        A.bigintConstraints({ min: BigInt(0), max: BigInt(10) })
      )
    })
  })

  it("IntTypeId", () => {
    expectConstraints(S.number.pipe(S.int()), A.integerConstraints({}))
  })

  it("MinLengthTypeId", () => {
    expectConstraints(S.string.pipe(S.minLength(5)), A.stringConstraints({ minLength: 5 }))
  })

  it("MaxLengthTypeId", () => {
    expectConstraints(S.string.pipe(S.maxLength(5)), A.stringConstraints({ maxLength: 5 }))
  })

  it("ItemsCountTypeId", () => {
    expectConstraints(
      S.array(S.string).pipe(S.itemsCount(5)),
      A.arrayConstraints({ minLength: 5, maxLength: 5 })
    )
  })

  it("MinItemsTypeId", () => {
    expectConstraints(S.array(S.string).pipe(S.minItems(4)), A.arrayConstraints({ minLength: 4 }))
  })

  it("MaxItemsTypeId", () => {
    expectConstraints(S.array(S.string).pipe(S.maxItems(6)), A.arrayConstraints({ maxLength: 6 }))
  })
})

describe("Arbitrary/combineConstraints", () => {
  it("Number <> Number", () => {
    const c1 = A.numberConstraints({ min: 0, max: 10, noNaN: true })
    const c2 = A.numberConstraints({ min: 1, max: 9, noDefaultInfinity: true })
    const c3 = A.numberConstraints({ min: 1, max: 9, noNaN: true, noDefaultInfinity: true })
    expect(A.combineConstraints(c1, c2)).toEqual(c3)
    expect(A.combineConstraints(c2, c1)).toEqual(c3)
  })

  it("Number <> Integer", () => {
    const c1 = A.numberConstraints({ min: 0, max: 10, noNaN: true })
    const c2 = A.integerConstraints({ min: 1, max: 9 })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })

  it("BigInt <> BigInt", () => {
    const c1 = A.bigintConstraints({ min: BigInt(0), max: BigInt(10) })
    const c2 = A.bigintConstraints({ min: BigInt(1), max: BigInt(9) })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })

  it("String <> String", () => {
    const c1 = A.stringConstraints({ minLength: 0, maxLength: 10 })
    const c2 = A.stringConstraints({ minLength: 1, maxLength: 9 })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })

  it("Number <> undefined", () => {
    expect(
      A.combineConstraints(A.numberConstraints({}), undefined)
    ).toEqual(A.numberConstraints({}))
  })

  it("Number <> String", () => {
    expect(
      A.combineConstraints(A.numberConstraints({}), A.stringConstraints({}))
    ).toEqual(undefined)
  })

  it("String <> Number", () => {
    expect(
      A.combineConstraints(A.stringConstraints({}), A.numberConstraints({}))
    ).toEqual(undefined)
  })

  it("Integer <> String", () => {
    expect(
      A.combineConstraints(A.integerConstraints({}), A.stringConstraints({}))
    ).toEqual(undefined)
  })

  it("Array <> Array", () => {
    const c1 = A.arrayConstraints({ minLength: 0, maxLength: 10 })
    const c2 = A.arrayConstraints({ minLength: 1, maxLength: 9 })
    expect(A.combineConstraints(c1, c2)).toEqual(c2)
    expect(A.combineConstraints(c2, c1)).toEqual(c2)
  })
})
