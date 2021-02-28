import "../Operator"

import { Stack } from "../Stack"

/**
 * `Hash[A]` provides a way to hash a value
 */
export interface Hash<A> {
  readonly hash: (x: A) => number
}

export function makeHash<A>(hash: (x: A) => number): Hash<A> {
  return { hash }
}

export function string(str: string) {
  let h = 5381
  let i = str.length
  while (i) h = (h * 33) ^ str.charCodeAt(--i)
  return h
}

export function opt(n: number) {
  return (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)
}

export function hash(key: unknown): number {
  let stack: Stack<unknown> | undefined = undefined
  let current: unknown | undefined = key
  let hash = 0

  while (current) {
    switch (typeof current) {
      case "object": {
        if (current != null) {
          for (const k of Object.keys(current).sort()) {
            stack = new Stack(current[k], stack)
            hash = combineHash(hash, opt(string(k)))
          }
        }
        current = undefined
        break
      }
      case "string": {
        hash = combineHash(hash, opt(string(current)))
        current = undefined
        break
      }
      case "bigint": {
        hash = combineHash(hash, opt(string(current.toString(10))))
        current = undefined
        break
      }
      case "boolean": {
        hash = combineHash(hash, opt(string(String(current))))
        current = undefined
        break
      }
      case "number": {
        hash = combineHash(hash, opt(current))
        current = undefined
        break
      }
      case "symbol": {
        current = undefined
        break
      }
      case "undefined": {
        current = undefined
        break
      }
      case "function": {
        current = undefined
        break
      }
    }
    if (!current && stack) {
      current = stack.value
      stack = stack.previous
    }
  }
  return hash
}

export function combineHash(a: number, b: number): number {
  return a === 0 ? b : b === 0 ? a : (a * 53) ^ b
}
