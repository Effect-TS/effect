import { PCGRandom } from "../Persistent/HashMap/Random"

/**
 * `Hash[A]` provides a way to hash a value
 */
export interface Hash<A> {
  readonly hash: (x: A) => number
}

/**
 * Get 32 bit hash of string.
 *
 * Based on:
 * http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 */
export function string(str: string) {
  let hash = 0
  for (let i = 0, len = str.length; i < len; ++i) {
    const c = str.charCodeAt(i)
    hash = ((hash << 5) - hash + c) | 0
  }
  return hash
}

const RANDOM = new PCGRandom(13)
const CACHE = new WeakMap<Object, number>()

function randomInt() {
  return RANDOM.integer(0x7fffffff)
}

export function randomHash(key: any): number {
  switch (typeof key) {
    case "bigint": {
      return string(key.toString(10))
    }
    case "string": {
      return string(key)
    }
    case "boolean": {
      return string(String(key))
    }
    case "number": {
      return key
    }
    case "symbol": {
      return 0
    }
    case "undefined": {
      return 0
    }
    default: {
      const hash = CACHE.get(key)
      if (hash) {
        return hash
      }
      const h = randomInt()
      CACHE.set(key, h)
      return h
    }
  }
}

export function combineHash(a: number, b: number): number {
  return (a * 53) ^ b
}
