// ets_tracing: off

const HAS_WEAKSET_SUPPORT = typeof WeakSet === "function"

const { keys } = Object

type Cache = {
  add: (value: any) => void
  has: (value: any) => boolean
}

/**
 * @function addToCache
 *
 * add object to cache if an object
 *
 * @param value the value to potentially add to cache
 * @param cache the cache to add to
 */
export function addToCache(value: any, cache: Cache) {
  if (value && typeof value === "object") {
    cache.add(value)
  }
}

export type EqualityComparator = (a: any, b: any, meta?: any) => boolean

/**
 * @function hasPair
 *
 * @description
 * does the `pairToMatch` exist in the list of `pairs` provided based on the
 * `isEqual` check
 *
 * @param pairs the pairs to compare against
 * @param pairToMatch the pair to match
 * @param isEqual the equality comparator used
 * @param meta the meta provided
 * @returns does the pair exist in the pairs provided
 */
export function hasPair(
  pairs: [any, any][],
  pairToMatch: [any, any],
  isEqual: EqualityComparator,
  meta: any
) {
  const { length } = pairs

  let pair: [any, any]

  for (let index = 0; index < length; index++) {
    pair = pairs[index]!

    if (
      isEqual(pair[0], pairToMatch[0], meta) &&
      isEqual(pair[1], pairToMatch[1], meta)
    ) {
      return true
    }
  }

  return false
}

/**
 * @function hasValue
 *
 * @description
 * does the `valueToMatch` exist in the list of `values` provided based on the
 * `isEqual` check
 *
 * @param values the values to compare against
 * @param valueToMatch the value to match
 * @param isEqual the equality comparator used
 * @param meta the meta provided
 * @returns does the value exist in the values provided
 */
export function hasValue(
  values: any[],
  valueToMatch: any,
  isEqual: EqualityComparator,
  meta: any
) {
  const { length } = values

  for (let index = 0; index < length; index++) {
    if (isEqual(values[index], valueToMatch, meta)) {
      return true
    }
  }

  return false
}

/**
 * @function sameValueZeroEqual
 *
 * @description
 * are the values passed strictly equal or both NaN
 *
 * @param a the value to compare against
 * @param b the value to test
 * @returns are the values equal by the SameValueZero principle
 */
export function sameValueZeroEqual(a: any, b: any) {
  return a === b || (a !== a && b !== b)
}

/**
 * @function isPlainObject
 *
 * @description
 * is the value a plain object
 *
 * @param value the value to test
 * @returns is the value a plain object
 */
export function isPlainObject(value: any) {
  return value.constructor === Object || value.constructor == null
}

/**
 * @function isPromiseLike
 *
 * @description
 * is the value promise-like (meaning it is thenable)
 *
 * @param value the value to test
 * @returns is the value promise-like
 */
export function isPromiseLike(value: any) {
  return !!value && typeof value.then === "function"
}

/**
 * @function isReactElement
 *
 * @description
 * is the value passed a react element
 *
 * @param value the value to test
 * @returns is the value a react element
 */
export function isReactElement(value: any) {
  return !!(value && value.$$typeof)
}

/**
 * @function getNewCacheFallback
 *
 * @description
 * in cases where WeakSet is not supported, creates a new custom
 * object that mimics the necessary API aspects for cache purposes
 *
 * @returns the new cache object
 */
export function getNewCacheFallback(): Cache {
  return Object.create({
    _values: [],

    add(value: any) {
      // @ts-expect-error
      this._values.push(value)
    },

    has(value: any) {
      // @ts-expect-error
      return this._values.indexOf(value) !== -1
    }
  })
}

/**
 * @function getNewCache
 *
 * @description
 * get a new cache object to prevent circular references
 *
 * @returns the new cache object
 */
export const getNewCache = ((canUseWeakMap: boolean) => {
  if (canUseWeakMap) {
    return function _getNewCache(): Cache {
      return new WeakSet()
    }
  }

  return getNewCacheFallback
})(HAS_WEAKSET_SUPPORT)

type EqualityComparatorCreator = (fn: EqualityComparator) => EqualityComparator

/**
 * @function createCircularEqualCreator
 *
 * @description
 * create a custom isEqual handler specific to circular objects
 *
 * @param [isEqual] the isEqual comparator to use instead of isDeepEqual
 * @returns the method to create the `isEqual` function
 */
export function createCircularEqualCreator(isEqual?: EqualityComparatorCreator) {
  return function createCircularEqual(comparator: EqualityComparator) {
    const _comparator = isEqual ? isEqual(comparator) : comparator

    return function circularEqual(a: any, b: any, cache: Cache = getNewCache()) {
      const hasA = cache.has(a)
      const hasB = cache.has(b)

      if (hasA || hasB) {
        return hasA && hasB
      }

      addToCache(a, cache)
      addToCache(b, cache)

      return _comparator(a, b, cache)
    }
  }
}

/**
 * @function toPairs
 *
 * @description
 * convert the map passed into pairs (meaning an array of [key, value] tuples)
 *
 * @param map the map to convert to [key, value] pairs (entries)
 * @returns the [key, value] pairs
 */
export function toPairs(map: Map<any, any>): [any, any][] {
  const pairs = new Array(map.size)

  let index = 0

  map.forEach((value, key) => {
    pairs[index++] = [key, value]
  })

  return pairs
}

/**
 * @function toValues
 *
 * @description
 * convert the set passed into values
 *
 * @param set the set to convert to values
 * @returns the values
 */
export function toValues(set: Set<any>) {
  const values = new Array(set.size)

  let index = 0

  set.forEach((value) => {
    values[index++] = value
  })

  return values
}

/**
 * @function areArraysEqual
 *
 * @description
 * are the arrays equal in value
 *
 * @param a the array to test
 * @param b the array to test against
 * @param isEqual the comparator to determine equality
 * @param meta the meta object to pass through
 * @returns are the arrays equal
 */
export function areArraysEqual(
  a: any[],
  b: any[],
  isEqual: EqualityComparator,
  meta: any
) {
  const { length } = a

  if (b.length !== length) {
    return false
  }

  for (let index = 0; index < length; index++) {
    if (!isEqual(a[index], b[index], meta)) {
      return false
    }
  }

  return true
}

/**
 * @function areMapsEqual
 *
 * @description
 * are the maps equal in value
 *
 * @param a the map to test
 * @param b the map to test against
 * @param isEqual the comparator to determine equality
 * @param meta the meta map to pass through
 * @returns are the maps equal
 */
export function areMapsEqual(
  a: Map<any, any>,
  b: Map<any, any>,
  isEqual: EqualityComparator,
  meta: any
) {
  if (a.size !== b.size) {
    return false
  }

  const pairsA = toPairs(a)
  const pairsB = toPairs(b)

  return isEqual(pairsA, pairsB, meta)
}

type Dictionary<Type> = {
  [key: string]: Type
  [index: number]: Type
}

const OWNER = "_owner"

const hasOwnProperty = Function.prototype.bind.call(
  Function.prototype.call,
  Object.prototype.hasOwnProperty
)

/**
 * @function areObjectsEqual
 *
 * @description
 * are the objects equal in value
 *
 * @param a the object to test
 * @param b the object to test against
 * @param isEqual the comparator to determine equality
 * @param meta the meta object to pass through
 * @returns are the objects equal
 */
export function areObjectsEqual(
  a: Dictionary<any>,
  b: Dictionary<any>,
  isEqual: EqualityComparator,
  meta: any
) {
  const keysA = keys(a)

  const { length } = keysA

  if (keys(b).length !== length) {
    return false
  }

  let key: string

  for (let index = 0; index < length; index++) {
    key = keysA[index]!

    if (!hasOwnProperty(b, key)) {
      return false
    }

    if (key === OWNER && isReactElement(a)) {
      if (!isReactElement(b)) {
        return false
      }
    } else if (!isEqual(a[key], b[key], meta)) {
      return false
    }
  }

  return true
}

/**
 * @function areRegExpsEqual
 *
 * @description
 * are the regExps equal in value
 *
 * @param a the regExp to test
 * @param b the regExp to test agains
 * @returns are the regExps equal
 */
export function areRegExpsEqual(a: RegExp, b: RegExp) {
  return (
    a.source === b.source &&
    a.global === b.global &&
    a.ignoreCase === b.ignoreCase &&
    a.multiline === b.multiline &&
    a.unicode === b.unicode &&
    a.sticky === b.sticky &&
    a.lastIndex === b.lastIndex
  )
}

/**
 * @function areSetsEqual
 *
 * @description
 * are the sets equal in value
 *
 * @param a the set to test
 * @param b the set to test against
 * @param isEqual the comparator to determine equality
 * @param meta the meta set to pass through
 * @returns are the sets equal
 */
export function areSetsEqual(
  a: Set<any>,
  b: Set<any>,
  isEqual: EqualityComparator,
  meta: any
) {
  if (a.size !== b.size) {
    return false
  }

  const valuesA = toValues(a)
  const valuesB = toValues(b)

  return isEqual(valuesA, valuesB, meta)
}
