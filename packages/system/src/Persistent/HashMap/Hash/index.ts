import { PCGRandom } from "../Random"

const RANDOM = new PCGRandom(13)
const CACHE = new WeakMap<Object, number>()

function randomInt() {
  return RANDOM.integer(0x7fffffff)
}

export function randomHash(key: any) {
  if (typeof key === "number") {
    return key
  }
  const hash = CACHE.get(key)
  if (hash) {
    return hash
  }
  const h = randomInt()
  CACHE.set(key, h)
  return h
}
