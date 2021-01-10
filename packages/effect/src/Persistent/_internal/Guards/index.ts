// Copyright https://github.com/frptools

import type { Primitive } from "../Types"

/**
 * Checks if the value is defined
 */
export function isDefined<T>(value: T | undefined): value is T
export function isDefined<T>(value: T | undefined): boolean
export function isDefined<T>(value: T | undefined) {
  return value !== void 0
}

/**
 * Checks if the value is undefined
 */
export function isUndefined<T>(value: T | undefined): value is undefined
export function isUndefined<T>(value: T | undefined): boolean
export function isUndefined<T>(value: T | undefined) {
  return value === void 0
}

/**
 * Checks if the value is null
 */
export function isNull<T>(value: T | null): value is null
export function isNull<T>(value: T | null): boolean
export function isNull<T>(value: T | null) {
  return value === null
}

/**
 * Checks if the value is not null
 */
export function isNotNull<T>(value: T | null): value is T
export function isNotNull<T>(value: T | null): boolean
export function isNotNull<T>(value: T | null) {
  return value !== null
}

/**
 * Checks if the value is null or undefined
 */
export function isNothing<T>(value: T | null | undefined): value is null | undefined
export function isNothing<T>(value: T | null | undefined): boolean
export function isNothing<T>(value: T | null | undefined) {
  return value === void 0 || value === null
}

/**
 * Checks that the value is neither null nor undefined
 */
export function isNotNothing<T>(value: T | null | undefined): value is T
export function isNotNothing<T>(value: T | null | undefined): boolean
export function isNotNothing<T>(value: T | null | undefined) {
  return value !== void 0 && value !== null
}

/**
 * Checks whether the object can be iterated over
 */
export function isIterable(value: object): value is Iterable<unknown>
export function isIterable(value: object): boolean
export function isIterable(value: object) {
  return Symbol.iterator in <any>value
}

/**
 * Checks that the value is an instance of a non-null object
 */
export function isObject<T extends Function>(value: T): false
export function isObject<T extends object>(value: T | Primitive): value is T
export function isObject(value: unknown): value is object
export function isObject<T extends object>(value: T | Primitive): boolean
export function isObject(value: any) {
  return typeof value === "object" && value !== null
}

/**
 * Checks that the value is a function
 */
export function isFunction(value: any): value is Function
export function isFunction(value: any): boolean
export function isFunction(value: any) {
  return typeof value === "function"
}

/**
 * Checks that the value is a boolean
 */
export function isBoolean(value: any): value is boolean
export function isBoolean(value: any): boolean
export function isBoolean(value: any) {
  return typeof value === "boolean"
}

/**
 * Checks that the value is a string
 */
export function isString(value: any): value is string
export function isString(value: any): boolean
export function isString(value: any) {
  return typeof value === "string"
}

/**
 * Checks that the value is a number
 */
export function isNumber(value: any): value is number
export function isNumber(value: any): boolean
export function isNumber(value: any) {
  return typeof value === "number"
}

/**
 * Checks that the value is a symbol
 */
export function isSymbol(value: any): value is symbol
export function isSymbol(value: any): boolean
export function isSymbol(value: any) {
  return typeof value === "symbol"
}

/**
 * Checks that an object has a plain Object constructor
 */
export function isPlain(value: object): value is object
export function isPlain(value: object): boolean
export function isPlain(value: object) {
  return value.constructor === Object
}

/**
 * Checks that an object is an instance of a specific class
 */
export function isInstanceOf<C extends { new (...args: any[]): A }, A extends object>(
  type: C
) {
  function instanceOf(value: object): value is A
  function instanceOf(value: object): boolean
  function instanceOf(value: object) {
    return value instanceof type
  }
  return instanceOf
}
