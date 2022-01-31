// ets_tracing: off

// forked from https://github.com/frptools

import { PCGRandom } from "../../Random/PCG/index.js"

export const hashSym = Symbol()

export interface HasHash {
  readonly [hashSym]: number
}

export function hasHash(u: unknown): u is HasHash {
  return typeof u === "object" && u !== null && hashSym in u
}

let _current = 0

export function opt(n: number) {
  return (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)
}

export function hash(arg: any): number {
  return opt(_hash(arg))
}

export function hashUnknown(arg: unknown): number {
  return opt(_hash(arg))
}

export function hashArray(arr: readonly any[]): number {
  return opt(_hashArray(arr))
}

export function hashArgs(...args: any[]): number
export function hashArgs(): number {
  let h = 5381
  for (let i = 0; i < arguments.length; i++) {
    // eslint-disable-next-line prefer-rest-params
    h = _combineHash(h, hash(arguments[i]))
  }
  return opt(h)
}

export function combineHash(a: number, b: number): number {
  return opt(_combineHash(a, b))
}

export function hashObject(value: object): number {
  return opt(_hashObject(value))
}

export function hashMiscRef(o: Object): number {
  return opt(_hashMiscRef(o))
}

export function hashIterator(it: Iterator<any>): number {
  return opt(_hashIterator(it))
}

export function hashPlainObject(o: object): number {
  return opt(_hashPlainObject(o))
}

export function hashNumber(n: number): number {
  return opt(_hashNumber(n))
}

export function hashString(str: string): number {
  return opt(_hashString(str))
}

function isZero(value: any): boolean {
  return value === null || value === void 0 || value === false
}

const RANDOM = new PCGRandom((Math.random() * 4294967296) >>> 0)
const CACHE = new WeakMap<Object, number>()

export function randomInt() {
  return RANDOM.integer(0x7fffffff)
}

export function _hash(arg: any): number {
  if (isZero(arg)) return 0
  if (typeof arg.valueOf === "function" && arg.valueOf !== Object.prototype.valueOf) {
    arg = arg.valueOf()
    if (isZero(arg)) return 0
  }
  switch (typeof arg) {
    case "number":
      return _hashNumber(arg)
    case "string":
      return _hashString(arg)
    case "function":
      return _hashMiscRef(arg)
    case "object":
      return _hashObject(arg)
    case "boolean":
      return arg === true ? 1 : 0
    case "symbol":
      return _hashString(String(arg))
    case "bigint":
      return _hashString(arg.toString(10))
    case "undefined": {
      return 0
    }
  }
}

export function _hashArray(arr: readonly any[]): number {
  let h = 6151
  for (let i = 0; i < arr.length; i++) {
    h = _combineHash(h, _hash(arr[i]))
  }
  return h
}

export function _combineHash(a: number, b: number): number {
  return (a * 53) ^ b
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== void 0
}

export function isIterable(value: object): value is Iterable<unknown> {
  return Symbol.iterator in <any>value
}

export function _hashObject(value: object): number {
  if (hasHash(value)) {
    return value[hashSym]
  } else {
    let h = CACHE.get(value)
    if (isDefined(h)) return h
    h = _current++
    CACHE.set(value, h)
    return h
  }
}

export function _hashMiscRef(o: Object): number {
  let h = CACHE.get(o)
  if (isDefined(h)) return h
  h = randomInt()
  CACHE.set(o, h)
  return h
}

export function _hashIterator(it: Iterator<any>): number {
  let h = 6151
  let current: IteratorResult<any>
  while (!(current = it.next()).done) {
    h = _combineHash(h, hash(current.value))
  }
  return h
}

export function _hashPlainObject(o: object): number {
  CACHE.set(o, randomInt())
  const keys = Object.keys(o).sort()
  let h = 12289
  for (let i = 0; i < keys.length; i++) {
    h = _combineHash(h, _hashString(keys[i]!))
    h = _combineHash(h, hash((o as any)[keys[i]!]))
  }
  return h
}

export function _hashNumber(n: number): number {
  if (n !== n || n === Infinity) return 0
  let h = n | 0
  if (h !== n) h ^= n * 0xffffffff
  while (n > 0xffffffff) h ^= n /= 0xffffffff
  return n
}

export function _hashString(str: string): number {
  let h = 5381,
    i = str.length
  while (i) h = (h * 33) ^ str.charCodeAt(--i)
  return h
}
