import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { Function as Fun, pipe, Predicate } from "effect"

const isPositive: Predicate.Predicate<number> = (n) => n > 0
const isNegative: Predicate.Predicate<number> = (n) => n < 0
const isLessThan2: Predicate.Predicate<number> = (n) => n < 2
const isString: Predicate.Refinement<unknown, string> = (u: unknown): u is string => typeof u === "string"

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}

type NonEmptyString = string & NonEmptyStringBrand

const isNonEmptyString: Predicate.Refinement<string, NonEmptyString> = (s): s is NonEmptyString => s.length > 0

describe("Predicate", () => {
  it("compose", () => {
    const refinement = pipe(isString, Predicate.compose(isNonEmptyString))
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
      Predicate.mapInput((a: A) => a.a)
    )
    assertFalse(predicate({ a: -1 }))
    assertFalse(predicate({ a: 0 }))
    assertTrue(predicate({ a: 1 }))
  })

  it("product", () => {
    const product = Predicate.product
    const p = product(isPositive, isNegative)
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("productMany", () => {
    const productMany = Predicate.productMany
    const p = productMany(isPositive, [isNegative])
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("tuple", () => {
    const p = Predicate.tuple(isPositive, isNegative)
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("struct", () => {
    const p = Predicate.struct({ a: isPositive, b: isNegative })
    assertTrue(p({ a: 1, b: -1 }))
    assertFalse(p({ a: 1, b: 1 }))
    assertFalse(p({ a: -1, b: -1 }))
    assertFalse(p({ a: -1, b: 1 }))
  })

  it("all", () => {
    const p = Predicate.all([isPositive, isNegative])
    assertTrue(p([1]))
    assertTrue(p([1, -1]))
    assertFalse(p([1, 1]))
    assertFalse(p([-1, -1]))
    assertFalse(p([-1, 1]))
  })

  it("not", () => {
    const p = Predicate.not(isPositive)
    assertFalse(p(1))
    assertTrue(p(0))
    assertTrue(p(-1))
  })

  it("or", () => {
    const p = pipe(isPositive, Predicate.or(isNegative))
    assertTrue(p(-1))
    assertTrue(p(1))
    assertFalse(p(0))
  })

  it("and", () => {
    const p = pipe(isPositive, Predicate.and(isLessThan2))
    assertTrue(p(1))
    assertFalse(p(-1))
    assertFalse(p(3))
  })

  it("xor", () => {
    assertFalse(pipe(Fun.constTrue, Predicate.xor(Fun.constTrue))(null)) // true xor true = false
    assertTrue(pipe(Fun.constTrue, Predicate.xor(Fun.constFalse))(null)) // true xor false = true
    assertTrue(pipe(Fun.constFalse, Predicate.xor(Fun.constTrue))(null)) // false xor true = true
    assertFalse(pipe(Fun.constFalse, Predicate.xor(Fun.constFalse))(null)) // false xor false = false
  })

  it("eqv", () => {
    assertTrue(pipe(Fun.constTrue, Predicate.eqv(Fun.constTrue))(null)) // true eqv true = true
    assertFalse(pipe(Fun.constTrue, Predicate.eqv(Fun.constFalse))(null)) // true eqv false = false
    assertFalse(pipe(Fun.constFalse, Predicate.eqv(Fun.constTrue))(null)) // false eqv true = false
    assertTrue(pipe(Fun.constFalse, Predicate.eqv(Fun.constFalse))(null)) // false eqv false = true
  })

  it("implies", () => {
    assertTrue(pipe(Fun.constTrue, Predicate.implies(Fun.constTrue))(null)) // true implies true = true
    assertFalse(pipe(Fun.constTrue, Predicate.implies(Fun.constFalse))(null)) // true implies false = false
    assertTrue(pipe(Fun.constFalse, Predicate.implies(Fun.constTrue))(null)) // false implies true = true
    assertTrue(pipe(Fun.constFalse, Predicate.implies(Fun.constFalse))(null)) // false implies false = true
  })

  it("nor", () => {
    assertFalse(pipe(Fun.constTrue, Predicate.nor(Fun.constTrue))(null)) // true nor true = false
    assertFalse(pipe(Fun.constTrue, Predicate.nor(Fun.constFalse))(null)) // true nor false = false
    assertFalse(pipe(Fun.constFalse, Predicate.nor(Fun.constTrue))(null)) // false nor true = false
    assertTrue(pipe(Fun.constFalse, Predicate.nor(Fun.constFalse))(null)) // false nor false = true
  })

  it("nand", () => {
    assertFalse(pipe(Fun.constTrue, Predicate.nand(Fun.constTrue))(null)) // true nand true = false
    assertTrue(pipe(Fun.constTrue, Predicate.nand(Fun.constFalse))(null)) // true nand false = true
    assertTrue(pipe(Fun.constFalse, Predicate.nand(Fun.constTrue))(null)) // false nand true = true
    assertTrue(pipe(Fun.constFalse, Predicate.nand(Fun.constFalse))(null)) // false nand false = true
  })

  it("some", () => {
    const predicate = Predicate.some([isPositive, isNegative])
    assertFalse(predicate(0))
    assertTrue(predicate(-1))
    assertTrue(predicate(1))
  })

  it("every", () => {
    const predicate = Predicate.every([isPositive, isLessThan2])
    assertFalse(predicate(0))
    assertFalse(predicate(-2))
    assertTrue(predicate(1))
  })

  it("isTruthy", () => {
    assertTrue(Predicate.isTruthy(true))
    assertFalse(Predicate.isTruthy(false))
    assertTrue(Predicate.isTruthy("a"))
    assertFalse(Predicate.isTruthy(""))
    assertTrue(Predicate.isTruthy(1))
    assertFalse(Predicate.isTruthy(0))
    assertTrue(Predicate.isTruthy(1n))
    assertFalse(Predicate.isTruthy(0n))
  })

  it("isFunction", () => {
    assertTrue(Predicate.isFunction(Predicate.isFunction))
    assertFalse(Predicate.isFunction("function"))
  })

  it("isUndefined", () => {
    assertTrue(Predicate.isUndefined(undefined))
    assertFalse(Predicate.isUndefined(null))
    assertFalse(Predicate.isUndefined("undefined"))
  })

  it("isNotUndefined", () => {
    assertFalse(Predicate.isNotUndefined(undefined))
    assertTrue(Predicate.isNotUndefined(null))
    assertTrue(Predicate.isNotUndefined("undefined"))
  })

  it("isNull", () => {
    assertTrue(Predicate.isNull(null))
    assertFalse(Predicate.isNull(undefined))
    assertFalse(Predicate.isNull("null"))
  })

  it("isNotNull", () => {
    assertFalse(Predicate.isNotNull(null))
    assertTrue(Predicate.isNotNull(undefined))
    assertTrue(Predicate.isNotNull("null"))
  })

  it("isNever", () => {
    assertFalse(Predicate.isNever(null))
    assertFalse(Predicate.isNever(undefined))
    assertFalse(Predicate.isNever({}))
    assertFalse(Predicate.isNever([]))
  })

  it("isUnknown", () => {
    assertTrue(Predicate.isUnknown(null))
    assertTrue(Predicate.isUnknown(undefined))
    assertTrue(Predicate.isUnknown({}))
    assertTrue(Predicate.isUnknown([]))
  })

  it("isObject", () => {
    assertTrue(Predicate.isObject({}))
    assertTrue(Predicate.isObject([]))
    assertTrue(Predicate.isObject(() => 1))
    assertFalse(Predicate.isObject(null))
    assertFalse(Predicate.isObject(undefined))
    assertFalse(Predicate.isObject("a"))
    assertFalse(Predicate.isObject(1))
    assertFalse(Predicate.isObject(true))
    assertFalse(Predicate.isObject(1n))
    assertFalse(Predicate.isObject(Symbol.for("a")))
  })

  it("isSet", () => {
    assertTrue(Predicate.isSet(new Set([1, 2])))
    assertTrue(Predicate.isSet(new Set()))
    assertFalse(Predicate.isSet({}))
    assertFalse(Predicate.isSet(null))
    assertFalse(Predicate.isSet(undefined))
  })

  it("isMap", () => {
    assertTrue(Predicate.isMap(new Map()))
    assertFalse(Predicate.isMap({}))
    assertFalse(Predicate.isMap(null))
    assertFalse(Predicate.isMap(undefined))
  })

  it("hasProperty", () => {
    const a = Symbol.for("effect/test/a")

    assertTrue(Predicate.hasProperty({ a: 1 }, "a"))
    assertTrue(Predicate.hasProperty("a")({ a: 1 }))
    assertTrue(Predicate.hasProperty({ [a]: 1 }, a))
    assertTrue(Predicate.hasProperty(a)({ [a]: 1 }))

    assertFalse(Predicate.hasProperty({}, "a"))
    assertFalse(Predicate.hasProperty(null, "a"))
    assertFalse(Predicate.hasProperty(undefined, "a"))
    assertFalse(Predicate.hasProperty({}, "a"))
    assertFalse(Predicate.hasProperty(() => {}, "a"))

    assertFalse(Predicate.hasProperty({}, a))
    assertFalse(Predicate.hasProperty(null, a))
    assertFalse(Predicate.hasProperty(undefined, a))
    assertFalse(Predicate.hasProperty({}, a))
    assertFalse(Predicate.hasProperty(() => {}, a))
  })

  it("isTagged", () => {
    assertFalse(Predicate.isTagged(1, "a"))
    assertFalse(Predicate.isTagged("", "a"))
    assertFalse(Predicate.isTagged({}, "a"))
    assertFalse(Predicate.isTagged("a")({}))
    assertFalse(Predicate.isTagged({ a: "a" }, "a"))
    assertTrue(Predicate.isTagged({ _tag: "a" }, "a"))
    assertTrue(Predicate.isTagged("a")({ _tag: "a" }))
  })

  it("isNullable", () => {
    assertTrue(Predicate.isNullable(null))
    assertTrue(Predicate.isNullable(undefined))
    assertFalse(Predicate.isNullable({}))
    assertFalse(Predicate.isNullable([]))
  })

  it("isNotNullable", () => {
    assertTrue(Predicate.isNotNullable({}))
    assertTrue(Predicate.isNotNullable([]))
    assertFalse(Predicate.isNotNullable(null))
    assertFalse(Predicate.isNotNullable(undefined))
  })

  it("isError", () => {
    assertTrue(Predicate.isError(new Error()))
    assertFalse(Predicate.isError(null))
    assertFalse(Predicate.isError({}))
  })

  it("isUint8Array", () => {
    assertTrue(Predicate.isUint8Array(new Uint8Array()))
    assertFalse(Predicate.isUint8Array(null))
    assertFalse(Predicate.isUint8Array({}))
  })

  it("isDate", () => {
    assertTrue(Predicate.isDate(new Date()))
    assertFalse(Predicate.isDate(null))
    assertFalse(Predicate.isDate({}))
  })

  it("isIterable", () => {
    assertTrue(Predicate.isIterable([]))
    assertTrue(Predicate.isIterable(new Set()))
    assertFalse(Predicate.isIterable(null))
    assertFalse(Predicate.isIterable({}))
  })

  it("isRecord", () => {
    assertTrue(Predicate.isRecord({}))
    assertTrue(Predicate.isRecord({ a: 1 }))

    assertFalse(Predicate.isRecord([]))
    assertFalse(Predicate.isRecord([1, 2, 3]))
    assertFalse(Predicate.isRecord(null))
    assertFalse(Predicate.isRecord(undefined))
    assertFalse(Predicate.isRecord(() => null))
  })

  it("isReadonlyRecord", () => {
    assertTrue(Predicate.isReadonlyRecord({}))
    assertTrue(Predicate.isReadonlyRecord({ a: 1 }))

    assertFalse(Predicate.isReadonlyRecord([]))
    assertFalse(Predicate.isReadonlyRecord([1, 2, 3]))
    assertFalse(Predicate.isReadonlyRecord(null))
    assertFalse(Predicate.isReadonlyRecord(undefined))
  })

  it("isTupleOf", () => {
    assertTrue(Predicate.isTupleOf([1, 2, 3], 3))
    assertFalse(Predicate.isTupleOf([1, 2, 3], 4))
    assertFalse(Predicate.isTupleOf([1, 2, 3], 2))
  })

  it("isTupleOfAtLeast", () => {
    assertTrue(Predicate.isTupleOfAtLeast([1, 2, 3], 3))
    assertTrue(Predicate.isTupleOfAtLeast([1, 2, 3], 2))
    assertFalse(Predicate.isTupleOfAtLeast([1, 2, 3], 4))
  })

  it("isRegExp", () => {
    assertTrue(Predicate.isRegExp(/a/))
    assertFalse(Predicate.isRegExp(null))
    assertFalse(Predicate.isRegExp("a"))
  })
})
