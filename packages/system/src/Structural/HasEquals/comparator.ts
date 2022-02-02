// ets_tracing: off

import type { EqualityComparator } from "./utils.js"
import {
  areArraysEqual,
  areMapsEqual,
  areObjectsEqual,
  areRegExpsEqual,
  areSetsEqual,
  isPlainObject,
  isPromiseLike,
  sameValueZeroEqual
} from "./utils.js"

const { isArray } = Array

const HAS_MAP_SUPPORT = typeof Map === "function"
const HAS_SET_SUPPORT = typeof Set === "function"

const OBJECT_TYPEOF = "object"

type EqualityComparatorCreator = (fn: EqualityComparator) => EqualityComparator

export function createComparator(createIsEqual?: EqualityComparatorCreator) {
  const isEqual: EqualityComparator =
    typeof createIsEqual === "function" ? createIsEqual(comparator) : comparator

  /**
   * @function comparator
   *
   * @description
   * compare the value of the two objects and return true if they are equivalent in values
   *
   * @param a the value to test against
   * @param b the value to test
   * @param [meta] an optional meta object that is passed through to all equality test calls
   * @returns are a and b equivalent in value
   */
  function comparator(a: any, b: any, meta?: any) {
    if (sameValueZeroEqual(a, b)) {
      return true
    }

    if (a && b && typeof a === OBJECT_TYPEOF && typeof b === OBJECT_TYPEOF) {
      if (isPlainObject(a) && isPlainObject(b)) {
        return areObjectsEqual(a, b, isEqual, meta)
      }

      const arrayA = isArray(a)
      const arrayB = isArray(b)

      if (arrayA || arrayB) {
        return arrayA === arrayB && areArraysEqual(a, b, isEqual, meta)
      }

      const aDate = a instanceof Date
      const bDate = b instanceof Date

      if (aDate || bDate) {
        return aDate === bDate && sameValueZeroEqual(a.getTime(), b.getTime())
      }

      const aRegExp = a instanceof RegExp
      const bRegExp = b instanceof RegExp

      if (aRegExp || bRegExp) {
        return aRegExp === bRegExp && areRegExpsEqual(a, b)
      }

      if (isPromiseLike(a) || isPromiseLike(b)) {
        return a === b
      }

      if (HAS_MAP_SUPPORT) {
        const aMap = a instanceof Map
        const bMap = b instanceof Map

        if (aMap || bMap) {
          return aMap === bMap && areMapsEqual(a, b, isEqual, meta)
        }
      }

      if (HAS_SET_SUPPORT) {
        const aSet = a instanceof Set
        const bSet = b instanceof Set

        if (aSet || bSet) {
          return aSet === bSet && areSetsEqual(a, b, isEqual, meta)
        }
      }

      return areObjectsEqual(a, b, isEqual, meta)
    }

    return false
  }

  return isEqual
}
