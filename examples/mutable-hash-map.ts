import { Equal, Hash } from "effect"
import * as MHM from "effect/MutableHashMap"
import * as MHMS from "effect/MutableHashMap"

class MyKey {
  constructor(readonly i: number) {}
  [Hash.symbol]() {
    return Hash.hash(this.i)
  }
  [Equal.symbol](that: MyKey): boolean {
    return this.i === that.i
  }
}

const map = MHM.empty<MyKey, void>()
const simpleMap = MHMS.empty<MyKey, void>()

console.time("MutableHashMap set x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHM.set(map, new MyKey(i), void 0)
}
console.timeEnd("MutableHashMap set x 1000000")

console.time("MutableHashMapSimple set x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHMS.set(simpleMap, new MyKey(i), void 0)
}
console.timeEnd("MutableHashMapSimple set x 1000000")

console.time("MutableHashMap get x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHM.get(map, new MyKey(i))
}
console.timeEnd("MutableHashMap get x 1000000")

console.time("MutableHashMapSimple get x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHMS.get(simpleMap, new MyKey(i))
}
console.timeEnd("MutableHashMapSimple get x 1000000")

console.time("MutableHashMap has x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHM.has(map, new MyKey(i))
}
console.timeEnd("MutableHashMap has x 1000000")

console.time("MutableHashMapSimple has x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHMS.has(simpleMap, new MyKey(i))
}
console.timeEnd("MutableHashMapSimple has x 1000000")

console.time("MutableHashMap size x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHM.size(map)
}
console.timeEnd("MutableHashMap size x 1000000")

console.time("MutableHashMapSimple size x 1000000")
for (let i = 0; i < 1000000; i++) {
  MHMS.size(simpleMap)
}
console.timeEnd("MutableHashMapSimple size x 1000000")
