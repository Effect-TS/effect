import { constFalse, constTrue, pipe } from "effect/Function"
import * as _ from "effect/Predicate"
import { deepStrictEqual } from "effect/test/util"
import { assert, describe, expect, it } from "vitest"

const isPositive: _.Predicate<number> = (n) => n > 0
const isNegative: _.Predicate<number> = (n) => n < 0
const isLessThan2: _.Predicate<number> = (n) => n < 2
const isString: _.Refinement<unknown, string> = (u: unknown): u is string => typeof u === "string"

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}

type NonEmptyString = string & NonEmptyStringBrand

const isNonEmptyString: _.Refinement<string, NonEmptyString> = (s): s is NonEmptyString => s.length > 0

describe("Predicate", () => {
  it("compose", () => {
    const refinement = pipe(isString, _.compose(isNonEmptyString))
    deepStrictEqual(refinement("a"), true)
    deepStrictEqual(refinement(null), false)
    deepStrictEqual(refinement(""), false)
  })

  it("mapInput", () => {
    type A = {
      readonly a: number
    }
    const predicate = pipe(
      isPositive,
      _.mapInput((a: A) => a.a)
    )
    deepStrictEqual(predicate({ a: -1 }), false)
    deepStrictEqual(predicate({ a: 0 }), false)
    deepStrictEqual(predicate({ a: 1 }), true)
  })

  it("product", () => {
    const product = _.product
    const p = product(isPositive, isNegative)
    deepStrictEqual(p([1, -1]), true)
    deepStrictEqual(p([1, 1]), false)
    deepStrictEqual(p([-1, -1]), false)
    deepStrictEqual(p([-1, 1]), false)
  })

  it("productMany", () => {
    const productMany = _.productMany
    const p = productMany(isPositive, [isNegative])
    deepStrictEqual(p([1, -1]), true)
    deepStrictEqual(p([1, 1]), false)
    deepStrictEqual(p([-1, -1]), false)
    deepStrictEqual(p([-1, 1]), false)
  })

  it("tuple", () => {
    const p = _.tuple(isPositive, isNegative)
    deepStrictEqual(p([1, -1]), true)
    deepStrictEqual(p([1, 1]), false)
    deepStrictEqual(p([-1, -1]), false)
    deepStrictEqual(p([-1, 1]), false)
  })

  it("struct", () => {
    const p = _.struct({ a: isPositive, b: isNegative })
    deepStrictEqual(p({ a: 1, b: -1 }), true)
    deepStrictEqual(p({ a: 1, b: 1 }), false)
    deepStrictEqual(p({ a: -1, b: -1 }), false)
    deepStrictEqual(p({ a: -1, b: 1 }), false)
  })

  it("all", () => {
    const p = _.all([isPositive, isNegative])
    deepStrictEqual(p([1]), true)
    deepStrictEqual(p([1, -1]), true)
    deepStrictEqual(p([1, 1]), false)
    deepStrictEqual(p([-1, -1]), false)
    deepStrictEqual(p([-1, 1]), false)
  })

  it("not", () => {
    const p = _.not(isPositive)
    deepStrictEqual(p(1), false)
    deepStrictEqual(p(0), true)
    deepStrictEqual(p(-1), true)
  })

  it("or", () => {
    const p = pipe(isPositive, _.or(isNegative))
    deepStrictEqual(p(-1), true)
    deepStrictEqual(p(1), true)
    deepStrictEqual(p(0), false)
  })

  it("and", () => {
    const p = pipe(isPositive, _.and(isLessThan2))
    deepStrictEqual(p(1), true)
    deepStrictEqual(p(-1), false)
    deepStrictEqual(p(3), false)
  })

  it("xor", () => {
    expect(pipe(constTrue, _.xor(constTrue))(null)).toBeFalsy() // true xor true = false
    expect(pipe(constTrue, _.xor(constFalse))(null)).toBeTruthy() // true xor false = true
    expect(pipe(constFalse, _.xor(constTrue))(null)).toBeTruthy() // false xor true = true
    expect(pipe(constFalse, _.xor(constFalse))(null)).toBeFalsy() // false xor false = false
  })

  it("eqv", () => {
    expect(pipe(constTrue, _.eqv(constTrue))(null)).toBeTruthy() // true eqv true = true
    expect(pipe(constTrue, _.eqv(constFalse))(null)).toBeFalsy() // true eqv false = false
    expect(pipe(constFalse, _.eqv(constTrue))(null)).toBeFalsy() // false eqv true = false
    expect(pipe(constFalse, _.eqv(constFalse))(null)).toBeTruthy() // false eqv false = true
  })

  it("implies", () => {
    expect(pipe(constTrue, _.implies(constTrue))(null)).toBeTruthy() // true implies true = true
    expect(pipe(constTrue, _.implies(constFalse))(null)).toBeFalsy() // true implies false = false
    expect(pipe(constFalse, _.implies(constTrue))(null)).toBeTruthy() // false implies true = true
    expect(pipe(constFalse, _.implies(constFalse))(null)).toBeTruthy() // false implies false = true
  })

  it("nor", () => {
    expect(pipe(constTrue, _.nor(constTrue))(null)).toBeFalsy() // true nor true = false
    expect(pipe(constTrue, _.nor(constFalse))(null)).toBeFalsy() // true nor false = false
    expect(pipe(constFalse, _.nor(constTrue))(null)).toBeFalsy() // false nor true = false
    expect(pipe(constFalse, _.nor(constFalse))(null)).toBeTruthy() // false nor false = true
  })

  it("nand", () => {
    expect(pipe(constTrue, _.nand(constTrue))(null)).toBeFalsy() // true nand true = false
    expect(pipe(constTrue, _.nand(constFalse))(null)).toBeTruthy() // true nand false = true
    expect(pipe(constFalse, _.nand(constTrue))(null)).toBeTruthy() // false nand true = true
    expect(pipe(constFalse, _.nand(constFalse))(null)).toBeTruthy() // false nand false = true
  })

  it("some", () => {
    const predicate = _.some([isPositive, isNegative])
    deepStrictEqual(predicate(0), false)
    deepStrictEqual(predicate(-1), true)
    deepStrictEqual(predicate(1), true)
  })

  it("every", () => {
    const predicate = _.every([isPositive, isLessThan2])
    deepStrictEqual(predicate(0), false)
    deepStrictEqual(predicate(-2), false)
    deepStrictEqual(predicate(1), true)
  })

  it("isTruthy", () => {
    expect(_.isTruthy(true)).toEqual(true)
    expect(_.isTruthy(false)).toEqual(false)
    expect(_.isTruthy("a")).toEqual(true)
    expect(_.isTruthy("")).toEqual(false)
    expect(_.isTruthy(1)).toEqual(true)
    expect(_.isTruthy(0)).toEqual(false)
    expect(_.isTruthy(1n)).toEqual(true)
    expect(_.isTruthy(0n)).toEqual(false)
  })

  it("isFunction", () => {
    assert.deepStrictEqual(_.isFunction(_.isFunction), true)
    assert.deepStrictEqual(_.isFunction("function"), false)
  })

  it("isUndefined", () => {
    assert.deepStrictEqual(_.isUndefined(undefined), true)
    assert.deepStrictEqual(_.isUndefined(null), false)
    assert.deepStrictEqual(_.isUndefined("undefined"), false)
  })

  it("isNotUndefined", () => {
    assert.deepStrictEqual(_.isNotUndefined(undefined), false)
    assert.deepStrictEqual(_.isNotUndefined(null), true)
    assert.deepStrictEqual(_.isNotUndefined("undefined"), true)
  })

  it("isNull", () => {
    assert.deepStrictEqual(_.isNull(null), true)
    assert.deepStrictEqual(_.isNull(undefined), false)
    assert.deepStrictEqual(_.isNull("null"), false)
  })

  it("isNotNull", () => {
    assert.deepStrictEqual(_.isNotNull(null), false)
    assert.deepStrictEqual(_.isNotNull(undefined), true)
    assert.deepStrictEqual(_.isNotNull("null"), true)
  })

  it("isNever", () => {
    assert.deepStrictEqual(_.isNever(null), false)
    assert.deepStrictEqual(_.isNever(undefined), false)
    assert.deepStrictEqual(_.isNever({}), false)
    assert.deepStrictEqual(_.isNever([]), false)
  })

  it("isUnknown", () => {
    assert.deepStrictEqual(_.isUnknown(null), true)
    assert.deepStrictEqual(_.isUnknown(undefined), true)
    assert.deepStrictEqual(_.isUnknown({}), true)
    assert.deepStrictEqual(_.isUnknown([]), true)
  })

  it("isObject", () => {
    assert.deepStrictEqual(_.isObject({}), true)
    assert.deepStrictEqual(_.isObject([]), true)
    assert.deepStrictEqual(_.isObject(() => 1), true)
    assert.deepStrictEqual(_.isObject(null), false)
    assert.deepStrictEqual(_.isObject(undefined), false)
    assert.deepStrictEqual(_.isObject("a"), false)
    assert.deepStrictEqual(_.isObject(1), false)
    assert.deepStrictEqual(_.isObject(true), false)
    assert.deepStrictEqual(_.isObject(1n), false)
    assert.deepStrictEqual(_.isObject(Symbol.for("a")), false)
  })

  it("isSet", () => {
    assert.deepStrictEqual(_.isSet(new Set([1, 2])), true)
    assert.deepStrictEqual(_.isSet(new Set()), true)
    assert.deepStrictEqual(_.isSet({}), false)
    assert.deepStrictEqual(_.isSet(null), false)
    assert.deepStrictEqual(_.isSet(undefined), false)
  })

  it("isMap", () => {
    assert.deepStrictEqual(_.isMap(new Map()), true)
    assert.deepStrictEqual(_.isMap({}), false)
    assert.deepStrictEqual(_.isMap(null), false)
    assert.deepStrictEqual(_.isMap(undefined), false)
  })

  it("hasProperty", () => {
    const a = Symbol.for("effect/test/a")

    assert.deepStrictEqual(_.hasProperty({ a: 1 }, "a"), true)
    assert.deepStrictEqual(_.hasProperty("a")({ a: 1 }), true)
    assert.deepStrictEqual(_.hasProperty({ [a]: 1 }, a), true)
    assert.deepStrictEqual(_.hasProperty(a)({ [a]: 1 }), true)

    assert.deepStrictEqual(_.hasProperty({}, "a"), false)
    assert.deepStrictEqual(_.hasProperty(null, "a"), false)
    assert.deepStrictEqual(_.hasProperty(undefined, "a"), false)
    assert.deepStrictEqual(_.hasProperty({}, "a"), false)
    assert.deepStrictEqual(_.hasProperty(() => {}, "a"), false)

    assert.deepStrictEqual(_.hasProperty({}, a), false)
    assert.deepStrictEqual(_.hasProperty(null, a), false)
    assert.deepStrictEqual(_.hasProperty(undefined, a), false)
    assert.deepStrictEqual(_.hasProperty({}, a), false)
    assert.deepStrictEqual(_.hasProperty(() => {}, a), false)
  })

  it("isTagged", () => {
    assert.deepStrictEqual(_.isTagged(1, "a"), false)
    assert.deepStrictEqual(_.isTagged("", "a"), false)
    assert.deepStrictEqual(_.isTagged({}, "a"), false)
    assert.deepStrictEqual(_.isTagged("a")({}), false)
    assert.deepStrictEqual(_.isTagged({ a: "a" }, "a"), false)
    assert.deepStrictEqual(_.isTagged({ _tag: "a" }, "a"), true)
    assert.deepStrictEqual(_.isTagged("a")({ _tag: "a" }), true)
  })

  it("isNullable", () => {
    assert.deepStrictEqual(_.isNullable(null), true)
    assert.deepStrictEqual(_.isNullable(undefined), true)
    assert.deepStrictEqual(_.isNullable({}), false)
    assert.deepStrictEqual(_.isNullable([]), false)
  })

  it("isNotNullable", () => {
    assert.deepStrictEqual(_.isNotNullable({}), true)
    assert.deepStrictEqual(_.isNotNullable([]), true)
    assert.deepStrictEqual(_.isNotNullable(null), false)
    assert.deepStrictEqual(_.isNotNullable(undefined), false)
  })

  it("isError", () => {
    assert.deepStrictEqual(_.isError(new Error()), true)
    assert.deepStrictEqual(_.isError(null), false)
    assert.deepStrictEqual(_.isError({}), false)
  })

  it("isUint8Array", () => {
    assert.deepStrictEqual(_.isUint8Array(new Uint8Array()), true)
    assert.deepStrictEqual(_.isUint8Array(null), false)
    assert.deepStrictEqual(_.isUint8Array({}), false)
  })

  it("isDate", () => {
    assert.deepStrictEqual(_.isDate(new Date()), true)
    assert.deepStrictEqual(_.isDate(null), false)
    assert.deepStrictEqual(_.isDate({}), false)
  })

  it("isIterable", () => {
    assert.deepStrictEqual(_.isIterable([]), true)
    assert.deepStrictEqual(_.isIterable(new Set()), true)
    assert.deepStrictEqual(_.isIterable(null), false)
    assert.deepStrictEqual(_.isIterable({}), false)
  })

  it("isRecord", () => {
    assert.deepStrictEqual(_.isRecord({}), true)
    assert.deepStrictEqual(_.isRecord({ a: 1 }), true)

    assert.deepStrictEqual(_.isRecord([]), false)
    assert.deepStrictEqual(_.isRecord([1, 2, 3]), false)
    assert.deepStrictEqual(_.isRecord(null), false)
    assert.deepStrictEqual(_.isRecord(undefined), false)
    assert.deepStrictEqual(_.isRecord(() => null), false)
  })

  it("isReadonlyRecord", () => {
    assert.deepStrictEqual(_.isReadonlyRecord({}), true)
    assert.deepStrictEqual(_.isReadonlyRecord({ a: 1 }), true)

    assert.deepStrictEqual(_.isReadonlyRecord([]), false)
    assert.deepStrictEqual(_.isReadonlyRecord([1, 2, 3]), false)
    assert.deepStrictEqual(_.isReadonlyRecord(null), false)
    assert.deepStrictEqual(_.isReadonlyRecord(undefined), false)
  })

  it("isTupleOf", () => {
    assert.deepStrictEqual(_.isTupleOf([1, 2, 3], 3), true)
    assert.deepStrictEqual(_.isTupleOf([1, 2, 3], 4), false)
    assert.deepStrictEqual(_.isTupleOf([1, 2, 3], 2), false)
  })

  it("isTupleOfAtLeast", () => {
    assert.deepStrictEqual(_.isTupleOfAtLeast([1, 2, 3], 3), true)
    assert.deepStrictEqual(_.isTupleOfAtLeast([1, 2, 3], 2), true)
    assert.deepStrictEqual(_.isTupleOfAtLeast([1, 2, 3], 4), false)
  })

  it("isRegExp", () => {
    assert.deepStrictEqual(_.isRegExp(/a/), true)
    assert.deepStrictEqual(_.isRegExp(null), false)
    assert.deepStrictEqual(_.isRegExp("a"), false)
  })
})
