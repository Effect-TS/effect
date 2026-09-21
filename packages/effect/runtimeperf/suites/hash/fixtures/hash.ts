import * as Arr from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Graph from "effect/Graph"
import * as Hash from "effect/Hash"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as MutableHashMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as Trie from "effect/Trie"
import assert from "node:assert/strict"

// Hash values are implementation-defined, so fixtures validate shape rather
// than exact values. This keeps a single fixture valid for base and head.
const isHash = (result: unknown) => assert.equal(Number.isInteger(result), true)

class Person extends Data.TaggedClass("Person")<{
  readonly id: number
  readonly name: string
  readonly email: string
  readonly active: boolean
}> {}

const makeStruct3 = (i: number) => ({ a: i, b: "value", c: true })

const makeNested = (i: number) => ({
  id: i,
  user: { name: "Ada", tags: ["admin", "ops"], address: { city: "London", zip: "N1" } },
  meta: { createdAt: 1_700_000_000_000 + i, version: 3 }
})

const makePerson = (i: number) => new Person({ id: i, name: "Ada", email: "ada@example.com", active: true })

const numbers32 = (i: number) => Array.from({ length: 32 }, (_, k) => i + k)
const strings16 = (i: number) => Array.from({ length: 16 }, (_, k) => `item-${i}-${k}`)

const map8 = (i: number) => new Map(Array.from({ length: 8 }, (_, k) => [`k${k}`, i + k] as const))
const set8 = (i: number) => new Set(Array.from({ length: 8 }, (_, k) => i + k))

const bytes64 = (i: number) => {
  const bytes = new Uint8Array(64)
  for (let k = 0; k < 64; k++) bytes[k] = (i + k) & 0xff
  return bytes
}

// Warm: the same object is hashed repeatedly, measuring the cached path.
const warm = (value: unknown) => () => ({
  run: () => Hash.hash(value),
  validate: isHash
})

// Cold: a fresh object is built and hashed on every call, measuring
// classification plus computation. Construction cost is identical for base
// and head, so paired comparisons isolate the hashing change.
const cold = (make: (i: number) => unknown) => () => {
  let i = 0
  return {
    run: () => Hash.hash(make(i++)),
    validate: isHash
  }
}

export const warmStruct3 = warm(makeStruct3(0))
export const warmDate = warm(new Date(1_700_000_000_000))
export const warmRegExp = warm(/^[a-z]+@[a-z]+\.[a-z]{2,}$/i)

export const coldStruct3 = cold(makeStruct3)
export const coldNested = cold(makeNested)
export const coldDataClass = cold(makePerson)
export const coldTuple2 = cold((i) => ["user", i])
export const coldMap8 = cold(map8)
export const coldSet8 = cold(set8)
export const coldUint8Array64 = cold(bytes64)
export const coldDate = cold((i) => new Date(1_700_000_000_000 + i))
export const coldRegExp = cold((i) => new RegExp(`^item-${i & 0xff}$`, "i"))
export const coldOptionSome = cold((i) => Option.some(makeStruct3(i)))
export const coldChunk16 = cold((i) => Chunk.fromIterable(numbers32(i).slice(0, 16)))

const primitive = <A>(values: ReadonlyArray<A>) => () => {
  let i = 0
  return {
    run: () => Hash.hash(values[i++ & 63]),
    validate: isHash
  }
}

export const numberInt = primitive(Array.from({ length: 64 }, (_, k) => k * 7919))
export const numberFloat = primitive(Array.from({ length: 64 }, (_, k) => k * 1.618033988749895))
export const string16 = primitive(Array.from({ length: 64 }, (_, k) => `abcdefghijkl${String(k).padStart(4, "0")}`))
export const string256 = primitive(
  Array.from({ length: 64 }, (_, k) => `${"x".repeat(252)}${String(k).padStart(4, "0")}`)
)
export const bigint = primitive(Array.from({ length: 64 }, (_, k) => BigInt(k) * BigInt(2) ** BigInt(40)))

export const hashMapDataClassKeys64 = () => {
  let i = 0
  return {
    run: () => {
      const base = i++ * 64
      let map = HashMap.empty<Person, number>()
      for (let k = 0; k < 64; k++) map = HashMap.set(map, makePerson(base + k), k)
      let found = 0
      for (let k = 0; k < 64; k++) {
        if (HashMap.has(map, makePerson(base + k))) found++
      }
      return found
    },
    validate: (result: unknown) => assert.equal(result, 64)
  }
}

export const equalsNestedCold = () => {
  let i = 0
  return {
    run: () => {
      const n = i++
      return Equal.equals(makeNested(n), makeNested(n))
    },
    validate: (result: unknown) => assert.equal(result, true)
  }
}

// A representative mix of values Effect programs hash: primitives, plain and
// nested records, Data classes, tuples, collections, dates and Effect data types.
const corpus: ReadonlyArray<(i: number) => unknown> = [
  (i) => i,
  (i) => i * 0.5,
  (i) => `id-${i}`,
  (i) => i % 2 === 0,
  makeStruct3,
  makeNested,
  makePerson,
  (i) => ["user", i],
  numbers32,
  strings16,
  map8,
  set8,
  bytes64,
  (i) => new Date(1_700_000_000_000 + i),
  (i) => Option.some(makeStruct3(i)),
  () => Option.none(),
  (i) => DateTime.makeUnsafe(1_700_000_000_000 + i),
  (i) => Chunk.fromIterable([i, i + 1, i + 2])
]

const corpusSize = 256

const hashAll = (values: ReadonlyArray<unknown>) => {
  let h = 0
  for (let k = 0; k < values.length; k++) h ^= Hash.hash(values[k])
  return h
}

export const mixedCorpusWarm256 = () => {
  const values = Array.from({ length: corpusSize }, (_, k) => corpus[k % corpus.length](k))
  return {
    run: () => hashAll(values),
    validate: isHash
  }
}

export const mixedCorpusCold256 = () => {
  let i = 0
  return {
    run: () => {
      const base = i++ * corpusSize
      let h = 0
      for (let k = 0; k < corpusSize; k++) h ^= Hash.hash(corpus[k % corpus.length](base + k))
      return h
    },
    validate: isHash
  }
}

// Hashed-collection workloads over input families whose hashes previously
// collapsed: the cost that matters is the whole insert/lookup operation, not
// the hash alone. Keys are fresh on every run, and lookups use fresh equal keys.
const collectionRoundTrip = (makeKey: (i: number, j: number) => unknown) => () => ({
  run: () => {
    let map = HashMap.empty<unknown, number>()
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) map = HashMap.set(map, makeKey(i, j), i)
    }
    let found = 0
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) {
        if (HashMap.has(map, makeKey(i, j))) found++
      }
    }
    return found
  },
  validate: (result: unknown) => assert.equal(result, 10_000)
})

export const hashMapRecordKeys10k = collectionRoundTrip((x, y) => ({ x, y }))
export const hashMapTupleKeys10k = collectionRoundTrip((a, b) => [a, b])

// Scaling curves for HashMap operations on record keys. The map holds the half
// of an integer grid where `x + y` is even; misses query the odd half, so they
// come from the same domain. Every operation uses fresh key objects.
const scalingKeys = (n: number) => {
  const side = Math.ceil(Math.sqrt(2 * n))
  const present: Array<readonly [number, number]> = []
  const absent: Array<readonly [number, number]> = []
  for (let x = 0; x < side; x++) {
    for (let y = 0; y < side; y++) {
      if ((x + y) % 2 === 0) {
        if (present.length < n) present.push([x, y])
      } else if (absent.length < n) {
        absent.push([x, y])
      }
    }
  }
  return { present, absent }
}

const buildMap = (keys: ReadonlyArray<readonly [number, number]>) => {
  let map = HashMap.empty<{ x: number; y: number }, number>()
  for (let i = 0; i < keys.length; i++) map = HashMap.set(map, { x: keys[i][0], y: keys[i][1] }, i)
  return map
}

const scaling = (n: number, op: "insert" | "hit" | "miss" | "remove") => () => {
  const { absent, present } = scalingKeys(n)
  const map = buildMap(present)
  switch (op) {
    case "insert":
      return {
        run: () => HashMap.size(buildMap(present)),
        validate: (result: unknown) => assert.equal(result, n)
      }
    case "hit":
    case "miss": {
      const queries = op === "hit" ? present : absent
      return {
        run: () => {
          let found = 0
          for (let i = 0; i < queries.length; i++) {
            if (HashMap.has(map, { x: queries[i][0], y: queries[i][1] })) found++
          }
          return found
        },
        validate: (result: unknown) => assert.equal(result, op === "hit" ? n : 0)
      }
    }
    case "remove":
      return {
        run: () => {
          let current = map
          for (let i = 0; i < present.length; i++) {
            current = HashMap.remove(current, { x: present[i][0], y: present[i][1] })
          }
          return HashMap.size(current)
        },
        validate: (result: unknown) => assert.equal(result, 0)
      }
  }
}

export const scalingInsert16 = scaling(16, "insert")
export const scalingInsert1024 = scaling(1024, "insert")
export const scalingInsert16384 = scaling(16384, "insert")
export const scalingHit16 = scaling(16, "hit")
export const scalingHit1024 = scaling(1024, "hit")
export const scalingHit16384 = scaling(16384, "hit")
export const scalingMiss16 = scaling(16, "miss")
export const scalingMiss1024 = scaling(1024, "miss")
export const scalingMiss16384 = scaling(16384, "miss")
export const scalingRemove16 = scaling(16, "remove")
export const scalingRemove1024 = scaling(1024, "remove")
export const scalingRemove16384 = scaling(16384, "remove")

// Equality workloads. Values are fresh unless the fixture measures reuse.
const intEntries = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => [i, i + offset] as const)

// Successive versions compared with Equal, as AtomRef and Stream.changes do.
const atomUpdate = (n: number) => () => {
  let map = HashMap.fromIterable(intEntries(n))
  let i = 0
  return {
    run: () => {
      const next = HashMap.set(map, i++ % n, i)
      const same = Equal.equals(next, map)
      map = next
      return same
    },
    validate: (result: unknown) => assert.equal(result, false)
  }
}

export const equalsAtomUpdateHashMap1k = atomUpdate(1_000)
export const equalsAtomUpdateHashMap10k = atomUpdate(10_000)
export const equalsAtomUpdateHashMap100k = atomUpdate(100_000)

export const equalsFreshHashMaps1k = () => ({
  run: () => Equal.equals(HashMap.fromIterable(intEntries(1000)), HashMap.fromIterable(intEntries(1000))),
  validate: (result: unknown) => assert.equal(result, true)
})

// The same two distinct, equal values compared repeatedly.
export const equalsSamePairNested = () => {
  const a = makeNested(1)
  const b = makeNested(1)
  return { run: () => Equal.equals(a, b), validate: (result: unknown) => assert.equal(result, true) }
}

export const equalsSamePairHashMap1k = () => {
  const a = HashMap.fromIterable(intEntries(1000))
  const b = HashMap.fromIterable(intEntries(1000))
  return { run: () => Equal.equals(a, b), validate: (result: unknown) => assert.equal(result, true) }
}

const tupleEntries = (n: number) => Array.from({ length: n }, (_, i) => [[i, `x${i}`], { v: i }] as const)

export const equalsFreshMap1k = () => ({
  run: () => Equal.equals(new Map(tupleEntries(1000)), new Map(tupleEntries(1000).reverse())),
  validate: (result: unknown) => assert.equal(result, true)
})

export const equalsFreshSet1k = () => ({
  run: () =>
    Equal.equals(new Set(tupleEntries(1000).map(([k]) => k)), new Set(tupleEntries(1000).map(([k]) => k).reverse())),
  validate: (result: unknown) => assert.equal(result, true)
})

// Consecutive-equality over fresh Data.Class values, as Stream.changes does.
export const equalsChangesDataClass1k = () => ({
  run: () => {
    let previous: Person | undefined
    let changes = 0
    for (let i = 0; i < 1000; i++) {
      const current = makePerson(i >> 2)
      if (previous === undefined || !Equal.equals(previous, current)) changes++
      previous = current
    }
    return changes
  },
  validate: (result: unknown) => assert.equal(result, 250)
})

// Persistent sequences and tries: operations on fresh versions derived from a
// shared base, as persistent data is used.
const chunkAppendHash = (n: number) => () => {
  const base = Chunk.fromIterable(Array.from({ length: n }, (_, i) => i))
  let i = 0
  return { run: () => Hash.hash(Chunk.append(base, i++)), validate: isHash }
}

export const chunkAppendHash1k = chunkAppendHash(1_000)
export const chunkAppendHash10k = chunkAppendHash(10_000)
export const chunkAppendHash100k = chunkAppendHash(100_000)

// Slices of a chunk built by concatenation share its nodes.
const chunkSliceHash = (n: number) => () => {
  let base = Chunk.empty<number>()
  for (let k = 0; k < n; k += 100) {
    base = Chunk.appendAll(base, Chunk.fromIterable(Array.from({ length: 100 }, (_, i) => k + i)))
  }
  let i = 0
  return { run: () => Hash.hash(Chunk.drop(base, 1 + (i++ % 50))), validate: isHash }
}

export const chunkSliceHash1k = chunkSliceHash(1_000)
export const chunkSliceHash10k = chunkSliceHash(10_000)
export const chunkSliceHash100k = chunkSliceHash(100_000)

const trieBase = (n: number) => Trie.fromIterable(Array.from({ length: n }, (_, i) => [`key-${i}`, i] as const))

export const trieHashDerived1k = () => {
  const base = trieBase(1000)
  let i = 0
  return { run: () => Hash.hash(Trie.insert(base, `new-${i}`, i++)), validate: isHash }
}

export const trieEqualsDerived1k = () => {
  const baseA = trieBase(1000)
  const baseB = trieBase(1000)
  let i = 0
  return {
    run: () => {
      const key = `new-${i++}`
      return Equal.equals(Trie.insert(baseA, key, 0), Trie.insert(baseB, key, 0))
    },
    validate: (result: unknown) => assert.equal(result, true)
  }
}

export const graphHash100 = cold((i) =>
  Graph.directed<number, number>((g) => {
    let previous = Graph.addNode(g, i)
    for (let k = 1; k < 100; k++) {
      const next = Graph.addNode(g, i + k)
      Graph.addEdge(g, previous, next, k)
      previous = next
    }
  })
)

// The case most favorable to hashing inside `Equal`: all-pairs comparison
// (deduplication) of large plain objects that differ only in a nested leaf at
// the end, so a structural comparison cannot stop early while a hash, computed
// once per object, would reject every pair.
const lateDifference = (id: number) => {
  const record: Record<string, unknown> = {}
  for (let k = 0; k < 20; k++) record[`field${k}`] = k
  record.meta = { tags: ["a", "b"], nested: { id } }
  return record
}

const earlyDifference = (id: number) => {
  const record: Record<string, unknown> = { id }
  for (let k = 0; k < 20; k++) record[`field${k}`] = k
  record.meta = { tags: ["a", "b"], nested: { id: 0 } }
  return record
}

const countEqualPairs = (values: ReadonlyArray<unknown>) => {
  let equal = 0
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (Equal.equals(values[i], values[j])) equal++
    }
  }
  return equal
}

const noEqualPairs = (result: unknown) => assert.equal(result, 0)

export const equalsDedupeLateFresh100 = () => ({
  run: () => countEqualPairs(Array.from({ length: 100 }, (_, i) => lateDifference(i))),
  validate: noEqualPairs
})

export const equalsDedupeLateReused100 = () => {
  const values = Array.from({ length: 100 }, (_, i) => lateDifference(i))
  return { run: () => countEqualPairs(values), validate: noEqualPairs }
}

export const equalsDedupeEarlyFresh100 = () => ({
  run: () => countEqualPairs(Array.from({ length: 100 }, (_, i) => earlyDifference(i))),
  validate: noEqualPairs
})

// Public API operations whose cost depends on hashing and equality, on fresh
// realistic values each run: records of small integers and Data classes, half
// of them duplicates.
const records = (n: number) => Array.from({ length: n }, (_, i) => ({ x: i % (n / 2), y: (i % (n / 2)) % 3 }))
const people = (n: number) => Array.from({ length: n }, (_, i) => makePerson(i % (n / 2)))

const expectLength = (length: number) => (result: unknown) => assert.equal(result, length)

export const apiArrayDedupeRecords1k = () => ({
  run: () => Arr.dedupe(records(1000)).length,
  validate: expectLength(500)
})

export const apiArrayDedupeDataClass1k = () => ({
  run: () => Arr.dedupe(people(1000)).length,
  validate: expectLength(500)
})

export const apiArrayIntersectionRecords1k = () => ({
  run: () => Arr.intersection(records(1000), records(1000)).length,
  validate: expectLength(1000)
})

export const apiArrayDifferenceRecords1k = () => ({
  run: () => Arr.difference(records(1000), records(1000)).length,
  validate: expectLength(0)
})

export const apiArrayDedupeAdjacentRecords1k = () => ({
  run: () => Arr.dedupeAdjacent(records(1000).flatMap((r) => [r, { ...r }])).length,
  validate: expectLength(1000)
})

export const apiHashSetUnionRecords1k = () => ({
  run: () => HashSet.size(HashSet.union(HashSet.fromIterable(records(1000)), HashSet.fromIterable(records(1000)))),
  validate: expectLength(500)
})

export const apiHashMapUnionDataClass1k = () => ({
  run: () => {
    const entries = people(1000).map((p, i) => [p, i] as const)
    return HashMap.size(HashMap.union(HashMap.fromIterable(entries), HashMap.fromIterable(entries)))
  },
  validate: expectLength(500)
})

export const apiMutableHashMapRecords1k = () => ({
  run: () => {
    const map = MutableHashMap.empty<{ x: number; y: number }, number>()
    for (const r of records(1000)) MutableHashMap.set(map, r, r.x)
    let found = 0
    for (const r of records(1000)) if (MutableHashMap.has(map, r)) found++
    return found
  },
  validate: expectLength(1000)
})

export const apiStreamChangesDataClass1k = () => ({
  run: () => {
    const values = Array.from({ length: 1000 }, (_, i) => makePerson(i >> 2))
    return Effect.runSync(Stream.runCollect(Stream.changes(Stream.fromIterable(values)))).length
  },
  validate: expectLength(250)
})

// Small Map / Set equality, below the size where grouping by hash obviously pays.
const smallEntries = (n: number) => Array.from({ length: n }, (_, i) => [{ k: i }, { v: i }] as const)

export const equalsFreshMap8 = () => ({
  run: () => Equal.equals(new Map(smallEntries(8)), new Map(smallEntries(8).reverse())),
  validate: (result: unknown) => assert.equal(result, true)
})

export const equalsFreshSet8 = () => ({
  run: () => Equal.equals(new Set(smallEntries(8).map(([k]) => k)), new Set(smallEntries(8).map(([k]) => k).reverse())),
  validate: (result: unknown) => assert.equal(result, true)
})

// Iteration over persistent collections.
const iterationMap = HashMap.fromIterable(Array.from({ length: 10_000 }, (_, i) => [i, i] as const))
const iterationSet = HashSet.fromIterable(Array.from({ length: 10_000 }, (_, i) => i))

export const iterateHashMapEntries10k = () => ({
  run: () => {
    let sum = 0
    for (const [k, v] of iterationMap) sum += k + v
    return sum
  },
  validate: (result: unknown) => assert.equal(result, 99_990_000)
})

export const iterateHashMapKeys10k = () => ({
  run: () => {
    let sum = 0
    for (const k of HashMap.keys(iterationMap)) sum += k
    return sum
  },
  validate: (result: unknown) => assert.equal(result, 49_995_000)
})

export const iterateHashSet10k = () => ({
  run: () => {
    let sum = 0
    for (const v of iterationSet) sum += v
    return sum
  },
  validate: (result: unknown) => assert.equal(result, 49_995_000)
})
