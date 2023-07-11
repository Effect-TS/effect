import * as A from "@effect/schema/Arbitrary"
import * as S from "@effect/schema/Schema"
import type * as FastCheck from "fast-check"

interface NumberConstraints {
  readonly _tag: "NumberConstraints"
  readonly constraints: FastCheck.FloatConstraints
}

interface StringConstraints {
  readonly _tag: "StringConstraints"
  readonly constraints: FastCheck.StringSharedConstraints
}

interface IntegerConstraints {
  readonly _tag: "IntegerConstraints"
  readonly constraints: FastCheck.IntegerConstraints
}

type Constraints = NumberConstraints | StringConstraints | IntegerConstraints

const expectConstraints = <I, A>(schema: S.Schema<I, A>, constraints: Constraints) => {
  expect(A.getConstraints(schema.ast as any)).toEqual(constraints)
}

describe.concurrent("Arbitrary.getConstraints", () => {
  it("GreaterThanTypeId", () => {
    expectConstraints(S.number.pipe(S.greaterThan(0)), {
      _tag: "NumberConstraints",
      constraints: { min: 0 }
    })
  })

  it("GreaterThanOrEqualToTypeId", () => {
    expectConstraints(S.number.pipe(S.greaterThanOrEqualTo(0)), {
      _tag: "NumberConstraints",
      constraints: { min: 0 }
    })
  })

  it("LessThanTypeId", () => {
    expectConstraints(S.number.pipe(S.lessThan(0)), {
      _tag: "NumberConstraints",
      constraints: { max: 0 }
    })
  })

  it("LessThanOrEqualToTypeId", () => {
    expectConstraints(S.number.pipe(S.lessThanOrEqualTo(0)), {
      _tag: "NumberConstraints",
      constraints: { max: 0 }
    })
  })

  it("PositiveTypeId", () => {
    expectConstraints(S.number.pipe(S.positive()), {
      _tag: "NumberConstraints",
      constraints: { min: 0 }
    })
  })

  it("NonNegativeTypeId", () => {
    expectConstraints(S.number.pipe(S.nonNegative()), {
      _tag: "NumberConstraints",
      constraints: { min: 0 }
    })
  })

  it("NegativeTypeId", () => {
    expectConstraints(S.number.pipe(S.negative()), {
      _tag: "NumberConstraints",
      constraints: { max: 0 }
    })
  })

  it("NonPositiveTypeId", () => {
    expectConstraints(S.number.pipe(S.nonPositive()), {
      _tag: "NumberConstraints",
      constraints: { max: 0 }
    })
  })

  it("IntTypeId", () => {
    expectConstraints(S.number.pipe(S.int()), { _tag: "IntegerConstraints", constraints: {} })
  })

  it("BetweenTypeId", () => {
    expectConstraints(S.number.pipe(S.between(0, 10)), {
      _tag: "NumberConstraints",
      constraints: { min: 0, max: 10 }
    })
  })

  it("MinLengthTypeId", () => {
    expectConstraints(S.string.pipe(S.minLength(5)), {
      _tag: "StringConstraints",
      constraints: { minLength: 5 }
    })
  })

  it("MaxLengthTypeId", () => {
    expectConstraints(S.string.pipe(S.maxLength(5)), {
      _tag: "StringConstraints",
      constraints: { maxLength: 5 }
    })
  })
})

describe.concurrent("Arbitrary.combineConstraints", () => {
  it("Number <> Number", () => {
    const c1: NumberConstraints = {
      _tag: "NumberConstraints",
      constraints: { min: 0, max: 10, noNaN: true }
    }
    const c2: NumberConstraints = {
      _tag: "NumberConstraints",
      constraints: { min: 1, max: 9, noDefaultInfinity: true }
    }
    const c3: NumberConstraints = {
      _tag: "NumberConstraints",
      constraints: { min: 1, max: 9, noNaN: true, noDefaultInfinity: true }
    }
    expect(A.combineConstraints(c1, c2)).toEqual(c3)
    expect(A.combineConstraints(c2, c1)).toEqual(c3)
  })

  it("Number <> Integer", () => {
    const c1: NumberConstraints = {
      _tag: "NumberConstraints",
      constraints: { min: 0, max: 10, noNaN: true }
    }
    const c2: IntegerConstraints = {
      _tag: "IntegerConstraints",
      constraints: { min: 1, max: 9 }
    }
    const c3: IntegerConstraints = {
      _tag: "IntegerConstraints",
      constraints: { min: 1, max: 9 }
    }
    expect(A.combineConstraints(c1, c2)).toEqual(c3)
    expect(A.combineConstraints(c2, c1)).toEqual(c3)
  })

  it("String <> String", () => {
    const c1: StringConstraints = {
      _tag: "StringConstraints",
      constraints: { minLength: 0, maxLength: 10 }
    }
    const c2: StringConstraints = {
      _tag: "StringConstraints",
      constraints: { minLength: 1, maxLength: 9 }
    }
    const c3: StringConstraints = {
      _tag: "StringConstraints",
      constraints: { minLength: 1, maxLength: 9 }
    }
    expect(A.combineConstraints(c1, c2)).toEqual(c3)
    expect(A.combineConstraints(c2, c1)).toEqual(c3)
  })

  it("Number <> undefined", () => {
    expect(
      A.combineConstraints({ _tag: "NumberConstraints", constraints: {} }, undefined)
    ).toEqual({ _tag: "NumberConstraints", constraints: {} })
  })

  it("Number <> String", () => {
    expect(
      A.combineConstraints({ _tag: "NumberConstraints", constraints: {} }, {
        _tag: "StringConstraints",
        constraints: {}
      })
    ).toEqual(undefined)
  })

  it("String <> Number", () => {
    expect(
      A.combineConstraints({ _tag: "StringConstraints", constraints: {} }, {
        _tag: "NumberConstraints",
        constraints: {}
      })
    ).toEqual(undefined)
  })

  it("Integer <> String", () => {
    expect(
      A.combineConstraints({ _tag: "IntegerConstraints", constraints: {} }, {
        _tag: "StringConstraints",
        constraints: {}
      })
    ).toEqual(undefined)
  })
})
