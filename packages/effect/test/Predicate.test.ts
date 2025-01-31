import { describe, it } from "@effect/vitest"
import { constFalse, constTrue, pipe } from "effect/Function"
import * as _ from "effect/Predicate"
import { assertFalse, assertTrue } from "effect/test/util"

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
    assertTrue(refinement("a"))
    assertFalse(refinement(null))
    assertFalse(refinement(""))
  })

  it("mapInput", () => {
    type A = {
      readonly a: number
    }
    const predicate = pipe(
      isPositive,
      _.mapInput((a: A) => a.a)
    )
    assertFalse(predicate({ a: -1 }))
    assertFalse(predicate({ a: 0 }))
    assertTrue(predicate({ a: 1 }))
  })

  it("product", () => {
    const product = _.product
    const p = product(isPositive, isNegative)
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("productMany", () => {
    const productMany = _.productMany
    const p = productMany(isPositive, [isNegative])
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("tuple", () => {
    const p = _.tuple(isPositive, isNegative)
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("struct", () => {
    const p = _.struct({ a: isPositive, b: isNegative })
    assertTrue(p({ a: 1, b: -1 }))
    assertFalse(p({ a: 1, b: 1 }))
    assertFalse(p({ a: -1, b: -1 }))
    assertFalse(p({ a: -1, b: 1 }))
  })

  it("all", () => {
    const p = _.all([isPositive, isNegative])
    assertTrue(p([1]))
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("not", () => {
    const p = _.not(isPositive)
    assertFalse(p(1))
    assertTrue(p(0))
    assertTrue(p(-1))
  })

  it("or", () => {
    const p = pipe(isPositive, _.or(isNegative))
    assertTrue(p(-1))
    assertTrue(p(1))
    assertFalse(p(0))
  })

  it("and", () => {
    const p = pipe(isPositive, _.and(isLessThan2))
    assertTrue(p(1))
    assertFalse(p(-1))
    assertFalse(p(3))
  })

  it("xor", () => {
    assertFalse(pipe(constTrue, _.xor(constTrue))(null)) // true xor true = false
    assertTrue(pipe(constTrue, _.xor(constFalse))(null)) // true xor false = true
    assertTrue(pipe(constFalse, _.xor(constTrue))(null)) // false xor true = true
    assertFalse(pipe(constFalse, _.xor(constFalse))(null)) // false xor false = false
  })

  it("eqv", () => {
    assertTrue(pipe(constTrue, _.eqv(constTrue))(null)) // true eqv true = true
    assertFalse(pipe(constTrue, _.eqv(constFalse))(null)) // true eqv false = false
    assertFalse(pipe(constFalse, _.eqv(constTrue))(null)) // false eqv true = false
    assertTrue(pipe(constFalse, _.eqv(constFalse))(null)) // false eqv false = true
  })

  it("implies", () => {
    assertTrue(pipe(constTrue, _.implies(constTrue))(null)) // true implies true = true
    assertFalse(pipe(constTrue, _.implies(constFalse))(null)) // true implies false = false
    assertTrue(pipe(constFalse, _.implies(constTrue))(null)) // false implies true = true
    assertTrue(pipe(constFalse, _.implies(constFalse))(null)) // false implies false = true
  })

  it("nor", () => {
    assertFalse(pipe(constTrue, _.nor(constTrue))(null)) // true nor true = false
    assertFalse(pipe(constTrue, _.nor(constFalse))(null)) // true nor false = false
    assertFalse(pipe(constFalse, _.nor(constTrue))(null)) // false nor true = false
    assertTrue(pipe(constFalse, _.nor(constFalse))(null)) // false nor false = true
  })

  it("nand", () => {
    assertFalse(pipe(constTrue, _.nand(constTrue))(null)) // true nand true = false
    assertTrue(pipe(constTrue, _.nand(constFalse))(null)) // true nand false = true
    assertTrue(pipe(constFalse, _.nand(constTrue))(null)) // false nand true = true
    assertTrue(pipe(constFalse, _.nand(constFalse))(null)) // false nand false = true
  })

  it("some", () => {
    const predicate = _.some([isPositive, isNegative])
    assertFalse(predicate(0))
    assertTrue(predicate(-1))
    assertTrue(predicate(1))
  })

  it("every", () => {
    const predicate = _.every([isPositive, isLessThan2])
    assertFalse(predicate(0))
    assertFalse(predicate(-2))
    assertTrue(predicate(1))
  })

  it("isTruthy", () => {
    assertTrue(_.isTruthy(true))
    assertFalse(_.isTruthy(false))
    assertTrue(_.isTruthy("a"))
    assertFalse(_.isTruthy(""))
    assertTrue(_.isTruthy(1))
    assertFalse(_.isTruthy(0))
    assertTrue(_.isTruthy(1n))
    assertFalse(_.isTruthy(0n))
  })

  it("isFunction", () => {
    assertTrue(_.isFunction(_.isFunction))
    assertFalse(_.isFunction("function"))
  })

  it("isUndefined", () => {
    assertTrue(_.isUndefined(undefined))
    assertFalse(_.isUndefined(null))
    assertFalse(_.isUndefined("undefined"))
  })

  it("isNotUndefined", () => {
    assertFalse(_.isNotUndefined(undefined))
    assertTrue(_.isNotUndefined(null))
    assertTrue(_.isNotUndefined("undefined"))
  })

  it("isNull", () => {
    assertTrue(_.isNull(null))
    assertFalse(_.isNull(undefined))
    assertFalse(_.isNull("null"))
  })

  it("isNotNull", () => {
    assertFalse(_.isNotNull(null))
    assertTrue(_.isNotNull(undefined))
    assertTrue(_.isNotNull("null"))
  })

  it("isNever", () => {
    assertFalse(_.isNever(null))
    assertFalse(_.isNever(undefined))
    assertFalse(_.isNever({}))
    assertFalse(_.isNever([]))
  })

  it("isUnknown", () => {
    assertTrue(_.isUnknown(null))
    assertTrue(_.isUnknown(undefined))
    assertTrue(_.isUnknown({}))
    assertTrue(_.isUnknown([]))
  })

  it("isObject", () => {
    assertTrue(_.isObject({}))
    assertTrue(_.isObject([]))
    assertTrue(_.isObject(() => 1))
    assertFalse(_.isObject(null))
    assertFalse(_.isObject(undefined))
    assertFalse(_.isObject("a"))
    assertFalse(_.isObject(1))
    assertFalse(_.isObject(true))
    assertFalse(_.isObject(1n))
    assertFalse(_.isObject(Symbol.for("a")))
  })

  it("isSet", () => {
    assertTrue(_.isSet(new Set([1, 2])))
    assertTrue(_.isSet(new Set()))
    assertFalse(_.isSet({}))
    assertFalse(_.isSet(null))
    assertFalse(_.isSet(undefined))
  })

  it("isMap", () => {
    assertTrue(_.isMap(new Map()))
    assertFalse(_.isMap({}))
    assertFalse(_.isMap(null))
    assertFalse(_.isMap(undefined))
  })

  it("hasProperty", () => {
    const a = Symbol.for("effect/test/a")

    assertTrue(_.hasProperty({ a: 1 }, "a"))
    assertTrue(_.hasProperty("a")({ a: 1 }))
    assertTrue(_.hasProperty({ [a]: 1 }, a))
    assertTrue(_.hasProperty(a)({ [a]: 1 }))

    assertFalse(_.hasProperty({}, "a"))
    assertFalse(_.hasProperty(null, "a"))
    assertFalse(_.hasProperty(undefined, "a"))
    assertFalse(_.hasProperty({}, "a"))
    assertFalse(_.hasProperty(() => {}, "a"))

    assertFalse(_.hasProperty({}, a))
    assertFalse(_.hasProperty(null, a))
    assertFalse(_.hasProperty(undefined, a))
    assertFalse(_.hasProperty({}, a))
    assertFalse(_.hasProperty(() => {}, a))
  })

  it("isTagged", () => {
    assertFalse(_.isTagged(1, "a"))
    assertFalse(_.isTagged("", "a"))
    assertFalse(_.isTagged({}, "a"))
    assertFalse(_.isTagged("a")({}))
    assertFalse(_.isTagged({ a: "a" }, "a"))
    assertTrue(_.isTagged({ _tag: "a" }, "a"))
    assertTrue(_.isTagged("a")({ _tag: "a" }))
  })

  it("isNullable", () => {
    assertTrue(_.isNullable(null))
    assertTrue(_.isNullable(undefined))
    assertFalse(_.isNullable({}))
    assertFalse(_.isNullable([]))
  })

  it("isNotNullable", () => {
    assertTrue(_.isNotNullable({}))
    assertTrue(_.isNotNullable([]))
    assertFalse(_.isNotNullable(null))
    assertFalse(_.isNotNullable(undefined))
  })

  it("isError", () => {
    assertTrue(_.isError(new Error()))
    assertFalse(_.isError(null))
    assertFalse(_.isError({}))
  })

  it("isUint8Array", () => {
    assertTrue(_.isUint8Array(new Uint8Array()))
    assertFalse(_.isUint8Array(null))
    assertFalse(_.isUint8Array({}))
  })

  it("isDate", () => {
    assertTrue(_.isDate(new Date()))
    assertFalse(_.isDate(null))
    assertFalse(_.isDate({}))
  })

  it("isIterable", () => {
    assertTrue(_.isIterable([]))
    assertTrue(_.isIterable(new Set()))
    assertFalse(_.isIterable(null))
    assertFalse(_.isIterable({}))
  })

  it("isRecord", () => {
    assertTrue(_.isRecord({}))
    assertTrue(_.isRecord({ a: 1 }))

    assertFalse(_.isRecord([]))
    assertFalse(_.isRecord([1, 2, 3]))
    assertFalse(_.isRecord(null))
    assertFalse(_.isRecord(undefined))
    assertFalse(_.isRecord(() => null))
  })

  it("isReadonlyRecord", () => {
    assertTrue(_.isReadonlyRecord({}))
    assertTrue(_.isReadonlyRecord({ a: 1 }))

    assertFalse(_.isReadonlyRecord([]))
    assertFalse(_.isReadonlyRecord([1, 2, 3]))
    assertFalse(_.isReadonlyRecord(null))
    assertFalse(_.isReadonlyRecord(undefined))
  })

  it("isTupleOf", () => {
    assertTrue(_.isTupleOf([1, 2, 3], 3))
    assertFalse(_.isTupleOf([1, 2, 3], 4))
    assertFalse(_.isTupleOf([1, 2, 3], 2))
  })

  it("isTupleOfAtLeast", () => {
    assertTrue(_.isTupleOfAtLeast([1, 2, 3], 3))
    assertTrue(_.isTupleOfAtLeast([1, 2, 3], 2))
    assertFalse(_.isTupleOfAtLeast([1, 2, 3], 4))
  })

  it("isRegExp", () => {
    assertTrue(_.isRegExp(/a/))
    assertFalse(_.isRegExp(null))
    assertFalse(_.isRegExp("a"))
  })
})
